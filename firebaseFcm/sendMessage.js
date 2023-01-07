const admin = require('firebase-admin');
const fireStore = require('firebase-admin/firestore');
const schedule = require('node-schedule');
var _ = require('lodash');

let serAccount = require('../firebaseFcm/dbcurd-67641-firebase-adminsdk-ax50d-d03370a8af.json');
let checkMessage = [];

admin.initializeApp({
    credential: admin.credential.cert(serAccount),
    databaseURL: "https://dbcurd-67641-default-rtdb.firebaseio.com"
})

const job = schedule.scheduleJob('* * 8 * * *', function(){

  checkMessage = [];

});
job.cancel();

exports.getData = async function (req, res){
  const dbcrawlingdata = fireStore.getFirestore().collection("crawlingData").get();
  const dbuser = fireStore.getFirestore().collection("users").get();
  // 크롤링 데이터 중 오늘 날짜에 들어오는 데이터 출력
  await getTodayDataList(dbcrawlingdata).then((vdata) => {
    // 지역 리스트
    localArray = [];
    localArrayData = [];

    vdata.forEach(async (vf) => {
      for (let index = 0; index < vf.length; index++) {
        const element = vf[index];
        //전체 데이터
        localArrayData.push(element);
        if(element['center_name '].includes('구청')){
          // console.log("구청 : " + element['center_name '].split('구청')[0]);
          localArray.push(element['center_name '].split('구청')[0].trim());
        }else if(element['center_name '].includes('문화재단')){
          // console.log("문화재단 : " + element['center_name '].split('문화재단')[0]);
          localArray.push(element['center_name '].split('문화재단')[0].trim());
        }
      }
      const set = new Set(localArray);
      const uniqueArr = [...set];

      // 사용자 아이디 리스트 출력.
      fcmSendMessage(await getUserList(dbuser, uniqueArr, localArrayData), checkMessage);
    });
  });

  return res.status(200).json(
    {success : true, message : "메시지 전달 성공"}
  )
}
// 현재 사용자 항목에서 -> 토큰 및 키워드 데이터 추출
async function getTodayDataList(dbcrawlingdata) {
  let today = new Date();   
  let todayDateValue = todayDate(today);
  let returnArray = [];
  let todayCheckValue = [];

  returnArray.push(
    await dbcrawlingdata.then((value) => {
      for (let index = 0; index < value.docs.length; index++) {
        var dt = Object.values(value.docs[index].data());
          for (var i=0; i <= dt.length; i++) {
            if(dt[i] != undefined){
              if(todayDateValue == todayDate(dt[i].registrationdate.toDate())){
                todayCheckValue.push(dt[i]);
              }
            }
          }
      }
    return todayCheckValue;
  }))
  // 오늘 날짜 가져오기
  function todayDate(date) {
      var year = date.getFullYear();
      var month = ('0' + (date.getMonth() + 1)).slice(-2);
      var day = ('0' + date.getDate()).slice(-2);
      var resultDate = year + '-' + month + '-' + day 
      return resultDate;
  }
  return returnArray;
}

async function getUserList(dbuser,localArray, localArrayData) {
  // console.log(localArray)     -> 오늘자 데이터가 있는 지역
  // console.log(localArrayData) -> 오늘자 데이터
  let pushData = [];
  let returnData = [];
  for (let localArrayIndex = 0; localArrayIndex < localArray.length; localArrayIndex++) {
    returnData.push(await dbuser.then( (value) => {
      for (let index = 0; index < value.docs.length; index++) {
        let userData = value.docs[index].data();
        // let userEmail =value.docs[index].data()['email'];
        let userLocal =value.docs[index].data()['local'];

        if(userLocal != undefined && userLocal != ''){
          if(userLocal.includes(localArray[localArrayIndex])){
            // console.log(localArrayData.length); -> 14
            for (let localArrayDataIndex = 0; localArrayDataIndex < localArrayData.length; localArrayDataIndex++) {
              let splitCenterName = '';

              if(localArrayData[localArrayDataIndex]['center_name '].includes('구청')){
                splitCenterName = localArrayData[localArrayDataIndex]['center_name '].split('구청')[0];
              }else if(localArrayData[localArrayDataIndex]['center_name '].includes('문화재단')){
                splitCenterName = localArrayData[localArrayDataIndex]['center_name '].split('문화재단')[0];
              }else if(localArrayData[localArrayDataIndex]['center_name '].includes('공단')){
                splitCenterName = localArrayData[localArrayDataIndex]['center_name '].split('공단')[0];
              }

              if(userLocal.includes(splitCenterName)){
                // 이메일 테스트 -> 확인 필요 사항 : 중복 되서 키워드 메시지가날라가는 부분 keyword 일치하지 않는 사용 자일 경우 체크 완료 메시지가 안감
                if(userData.usertoken != undefined){
                  //임시 타이틀 박스
                  for (let userDataIndex = 0; userDataIndex < userData.keyword.length; userDataIndex++) {

                    if( localArrayData[localArrayDataIndex].title.includes(userData.keyword[userDataIndex])){
                      if(userData.keyword[userDataIndex] != ''){
                        let objectPushData = {
                          token : userData.usertoken,
                          keyword : userData.keyword[userDataIndex],
                          title : localArrayData[localArrayDataIndex].title,
                          link : localArrayData[localArrayDataIndex].link,
                          registrationdate : localArrayData[localArrayDataIndex].registrationdate,
                          center_name : localArrayData[localArrayDataIndex]['center_name ']
                        }

                        pushData.push(objectPushData);
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
      return pushData;
    }));
  }
  return _.uniqBy(returnData[0], "title");
}

function fcmSendMessage(object,checkMessage){

  if(isEmptyArr(checkMessage)){
    for (let index = 0; index < object.length; index++) {
      // console.log("object[index] : "+ object[index].link)

      checkMessage.push(object[index].title);
      // send message
      messageSend(object[index].token, object[index].keyword, object[index].title, object[index].link, object[index].registrationdate, object[index].center_name);
    }
  }else {
    // console.log("checkMessage else :"+ checkMessage);
    for (let objectIndex = 0; objectIndex < object.length; objectIndex++) {
      const objectElement = object[objectIndex];
      if(checkMessage.indexOf(objectElement)){
        console.log("message exist");
      }else{
        checkMessage.push(object[index].title);
        // messageSend(object[index].token, object[index].keyword, object[index].title);
        messageSend(object[index].token, object[index].keyword, object[index].title, object[index].link, object[index].registrationdate, object[index].center_name);
      }
    }
  }
}

function messageSend(token, keyword, title, link, registrationdate, center_name) {
  let target_token = token;
    let message = {
      notification: {
        title:  keyword + '와 관련된 공고가 올라왔어요!',
        body: title,
      },
      data : {
        link : link,
        // registrationdate : registrationdate,
        center_name : center_name,
      },
      token: target_token,
    }
  admin
    .messaging()
    .send(message)
    .then(function (response) {
      console.log('메시지 전달 성공 : ', response)
    })
    .catch(function (err) {
      console.log('메시지 전달 실패 : ', err)
    })
}

function isEmptyArr(arr)  {
  if(Array.isArray(arr) && arr.length === 0)  {
    return true;
  }
  
  return false;
}