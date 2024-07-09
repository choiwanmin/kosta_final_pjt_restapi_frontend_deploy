import './MainChat.css';
import './MainChatReset.css';
import React from "react";
import axios from 'axios';
import { useEffect, useState } from 'react';
import SockJS from 'sockjs-client';
import { Stomp } from '@stomp/stompjs';
import { useRef } from 'react';
import sendMessage from './SendMessage';

export default function ConnectChatRoom({ roomid, userid, reloadRoom }) {
    const [messages, setMessages] = useState([]);
    const [chatRoom, setChatRoom] = useState(null);
    const [inputs, setInputs] = useState({});
    const [memberId, setMemberId] = useState([]);
    const [membername, setMembername] = useState([]);
    const token = sessionStorage.getItem('token');
    const stompClientRef = useRef(null);
    const [isConnected, setIsConnected] = useState(true);
    const [file, setFile] = useState(null);
    const [memberchatList, setMemberchatList] = useState({});
    const [jobchatList, setJobchatList] = useState({});

    useEffect(() => {
        if (chatRoom && chatRoom.name) {
            const name = chatRoom.name.split('_');
            const memId = name.filter(name => name !== chatRoom.chatRoomNames[0].host);
            setMemberId(memId);
        }
    }, [chatRoom]);


    useEffect(() => {
        if (chatRoom && chatRoom.chatRoomNames && chatRoom.chatRoomNames.length > 0) {
            setInputs({
                editableName: chatRoom.chatRoomNames[0].editableName.replace(/_/g, ' ').trim()
            });
        }
    }, [chatRoom]);

    useEffect(() => {
        if (roomid) {
            connect(roomid);
            centerChatRoom(roomid, userid);
        }
    }, [roomid]);

    const connect = (roomid) => {
        setIsConnected(true);
        if (!roomid) {
            return;
        }
        var socket = new SockJS(`${process.env.REACT_APP_SERVER}/ws`, null, {
        });
        var stompClient = Stomp.over(socket);
        stompClientRef.current = stompClient;
        stompClient.connect({}, function () {
            var subscriptionId = 'sub-' + userid;
            stompClient.subscribe('/room/' + roomid, function (messageOutput) {
                var message = JSON.parse(messageOutput.body);
                var cri = message[0].room.chatroomid;
                if (cri === roomid) {
                    loadMessages(roomid);
                }
            }, { id: subscriptionId });

            stompClient.subscribe('/recent/update', function () {

            });
            loadMessages(roomid);
        });
    };

    const sendMessages = () => {
        sendMessage(roomid, userid, stompClientRef, loadMessages);
        reloadRoom();
    };

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
    };

    const sendFileMessage = (roomid, userid, file) => {
        if (!file) {
            alert('파일을 선택해 주세요.');
            return;
        }

        const date = new Date();
        const timezoneOffset = date.getTimezoneOffset() * 60000;
        const seoulOffset = 9 * 3600000;
        const seoulTime = new Date(date.getTime() + timezoneOffset + seoulOffset);

        const formData = new FormData();
        formData.append('file', file);

        axios.post(`${process.env.REACT_APP_SERVER}/auth/chat/message/upload`, formData, {
            headers: { 'auth_token': token, 'Content-Type': 'multipart/form-data' }
        })
            .then(response => {
                const message = {
                    'type': 'FILE',
                    'fileName': response.data.fileName,
                    'fileRoot': response.data.fileRoot,
                    'sender': userid,
                    'partid': userid,
                    'sendDate': seoulTime.toISOString()
                };
                stompClientRef.current.send(`/send/chat/message/` + roomid, {}, JSON.stringify(message));
                loadMessages(roomid);
            })
            .catch(error => {
                console.error('Error uploading file:', error);
                alert('파일 업로드에 실패했습니다.');
            });
    };

    const showFileMessage = (message) => {
        if (message.type === "FILE") {
            const fileType = message.fileName.split('.').pop().toLowerCase();
            if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'].includes(fileType)) {
                return (
                    <img src={message.fileRoot} alt={message.fileName} style={{ width: '200px', height: '200px' }} />
                );
            } else {
                return (
                    <a href={message.fileRoot} download={message.fileName}>
                        {message.fileName}
                    </a>
                );
            }
        } else {
            return message.content && message.content.split('<br/>').map((content, index) => (
                <React.Fragment key={index}>
                    {content}
                    {index !== message.content.split('<br/>').length - 1 && <br />
                    }
                </React.Fragment>
            ));
        }
    };


    const loadMessages = () => {
        axios.get(`${process.env.REACT_APP_SERVER}/auth/chat/message/room/${roomid}`, { headers: { auth_token: token } })
            .then(function (res) {
                if (res.status === 200) {
                    setMessages(res.data.list);
                } else {
                    alert('메세지 로딩 실패');
                }
            })
    };

    const centerChatRoom = () => {
        axios.post(`${process.env.REACT_APP_SERVER}` + '/auth/chat/chatrooms/loadrooms/connect', {}, { headers: { auth_token: token }, params: { roomid: roomid, userid: userid } })
            .then(function (res) {
                if (res.status === 200) {
                    setChatRoom(res.data.chatroom);
                    setMembername(res.data.chatroom.memberNames)
                } else {
                    alert('채팅방 로딩 실패');
                }
            })
    }

    const editRoomName = () => {
        axios.post(`${process.env.REACT_APP_SERVER}` + '/auth/chat/chatrooms/edit', {}, { headers: { auth_token: token }, params: { roomid: roomid, newRoomName: inputs.editableName } })
            .then(function (res) {
                if (res.status === 200) {
                    alert('채팅방 이름 변경 성공');
                    reloadRoom();
                } else {
                    alert('채팅방 이름 변경 실패');
                }
            })
    }

    const getOutRoom = () => {
        axios.post(`${process.env.REACT_APP_SERVER}` + '/auth/chat/chatrooms/out', {}, { headers: { auth_token: token }, params: { roomid: roomid } })
            .then(function (res) {
                if (res.status === 200) {
                    alert('채팅방 나가기 성공');
                    disconnect();
                    reloadRoom();
                } else {
                    alert('채팅방 나가기 실패');
                }
            })
    }

    const disconnect = () => {
        if (stompClientRef.current) {
            stompClientRef.current.disconnect(() => {
                console.log('연결끊겼음');
            });
            stompClientRef.current = null;
            setIsConnected(false);
        }
    };

    const handleMemberClick = (clickedMemberId) => {
        memberchatinfo(clickedMemberId);
        console.dir(memberchatList);
    }

    const memberchatinfo = (clickedMemberId) => {
        axios.post(`${process.env.REACT_APP_SERVER}/member/memberchatinfo`, {}, { params: { userid: clickedMemberId } })
            .then(function (res) {
                if (res.status === 200) {
                    setMemberchatList(res.data.member);
                    setJobchatList(res.data.jobL);

                } else {
                    alert('사용자 정보 조회 실패');
                }
            })
    }

    const onChange = (e) => {
        const { name, value } = e.target;
        setInputs({
            ...inputs,
            [name]: value
        })
    }

    if (!isConnected) {
        return (
            <div>
                <h2>채팅방 나간 화면</h2>
            </div>
        );
    }


    return (
        <>
            <div className="chatbox">
                <div className="modal-dialog-scrollable">
                    <div className="modal-content">
                        {/* 채팅방 연결 화면, 채팅방 나가기 , 초대하기 */}
                        <div className="msg-head">
                            <div className="row">
                                <div className="col-8">
                                    <div className="d-flex align-items-center" id="centerstyle">
                                        <a href="#" class="d-flex align-items-center">
                                            <div class="flex-shrink-0">
                                                <img class="img-fluid-center" src="/member/memberimg?memberimgnm=${imgName}" alt="user img" />
                                                <span class="active"></span>
                                            </div>
                                            <div class="flex-grow-1 ms-3">
                                                <input class="roomNameStyle" type="text" name="editableName" onChange={onChange} value={inputs.editableName} />
                                                <img class="img-chateditImg" src="/img/chat/chatedit.png" onClick={editRoomName} />
                                                <div>
                                                    {membername.map((name, index) => (
                                                        <span key={index}>
                                                            <p className="membernameinfocss" type="button" data-bs-toggle="modal" data-bs-target={`#exampleModal${index}`} onClick={() => handleMemberClick(memberId[index])}>
                                                                {name}
                                                            </p>
                                                            <div className="modal fade" id={`exampleModal${index}`} tabIndex="-1" aria-labelledby={`exampleModalLabel${index}`} aria-hidden="true">
                                                                <div className="modal-dialog">
                                                                    <div className="modal-content">
                                                                        <div className="modal-header">
                                                                            <h5 className="modal-title" id={`exampleModalLabel${index}`}>Modal title</h5>
                                                                            <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                                                                        </div>
                                                                        <div className="modal-body">
                                                                            {memberchatList && (
                                                                                <div>
                                                                                    {/* <img src="/img/chat/memberchatList.memberimgnm"></img> */}
                                                                                    <p>사진: {memberchatList.memberimgnm}</p>
                                                                                    <p>이름: {name}</p>
                                                                                    <p>이메일: {memberchatList.email}</p>
                                                                                    {/* <p>부서: {memberchatList.deptid.deptnm}</p> */}
                                                                                    <p>부서번호: {memberchatList.cpnum}</p>
                                                                                    <p>직업: {jobchatList.joblvnm}</p>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                        <div className="modal-footer">
                                                                            <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                                                                            <button type="button" className="btn btn-primary">Save changes</button>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </span>
                                                    ))}
                                                </div>

                                            </div>
                                        </a>
                                    </div>
                                </div>
                                <div className="col-4">
                                    <ul className="moreoption">
                                        <li className="navbar nav-item dropdown">
                                            <a className="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false"><i className="fa fa-ellipsis-v" aria-hidden="true"></i></a>
                                            <ul className="dropdown-menu">
                                                <li><a className="dropdown-item" href="#" data-bs-toggle="modal" data-bs-target="#exampleModal2">초대</a></li>
                                                <li>
                                                    <hr className="dropdown-divider" />
                                                </li>
                                                <li>
                                                    <a className="dropdown-item" href="#" id="outButton" onClick={getOutRoom}>채팅방 나가기</a>
                                                </li>
                                            </ul>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        {/* 채팅방 메세지 출력 칸 */}
                        <div className="modal-body chat-content">
                            <div className="msg-body">
                                <ul id="chat-content">
                                    {messages?.map((message, index) => (
                                        <li key={index} className={message.sender === userid ? 'sender' : 'reply'}>
                                            <div className="chat_img_wrapper">
                                            </div>
                                            <span className="senderName">{message.username}</span>
                                            <p>{showFileMessage(message)}</p>
                                            <span className="time">
                                                {new Date(message.sendDate).toLocaleString('en-US', { timeZone: 'Asia/Seoul' })}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        {/* 메세지전송, 업로드 */}
                        <div className="send-box">
                            <div className="send-boxstyle2">
                                <textarea id="message" className="form-control" aria-label="message…" placeholder="Write message…" maxlength="1000"></textarea>
                                <button type="button" id="sendButton" onClick={sendMessages}><i className="fa fa-paper-plane" aria-hidden="true"></i>전송</button>
                            </div>
                            <div className="send-btns">
                                <div className="attach">
                                    <div className="button-wrapper">
                                        <span className="label">
                                            <img className="img-fluid" src="https://mehedihtml.com/chatbox/assets/img/upload.svg" alt="image title" /> attached file
                                        </span>
                                        <input type="file" name="upload" id="upload" className="upload-box" placeholder="Upload File" aria-label="Upload File" onChange={handleFileChange} />
                                    </div>
                                    <button type="button" id="sendFileButton" onClick={() => sendFileMessage(roomid, userid, file)}>업로드</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>

    );
}