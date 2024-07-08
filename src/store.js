import { configureStore, createSlice } from '@reduxjs/toolkit'

let recordNum = createSlice({
  name:"num",
  initialState:{num:0},
  reducers:{
    importNum(state,action){
      state.num = action.payload;
    }
  }
})
export let {importNum} = recordNum.actions;

let recordFlag = createSlice({
  name:"flag",
  initialState:false,
  reducers:{
    changeFlag(){
      return true;
    }
  }
})
export let {changeFlag} = recordFlag.actions;

let recordOut = createSlice({
  name:"out",
  initialState:false,
  reducers:{
    changeOut(){
      return true;
    }
  }
})
export let {changeOut} = recordOut.actions;

let dayoff = createSlice({
  name:"dayoff",
  initialState:{members:"",res:"",date1:null,date2:null},
  reducers:{
    getMem(state,action){
      state.members = action.payload
    },
    changeRes(state,action){
      state.res = action.payload
    },
    changeDay1(state,action){
      state.date1 = action.payload
    },
    changeDay2(state,action){
      state.date2 = action.payload
    }
  }
})
export let {getMem,changeRes,changeDay1,changeDay2} = dayoff.actions;

export default configureStore({
  reducer: {
    recordNum:recordNum.reducer,
    recordFlag:recordFlag.reducer,
    recordOut:recordOut.reducer,
    dayoff:dayoff.reducer
   }
}) 