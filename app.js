const express = require('express')
const app = express()
const fmcMessage = require('../nodejscra/firebaseFcm/sendMessage');

app.get('/', function (req, res) {
    console.log('connect /')
    res.send('Hello World !!')
})

// 알람 보ㄹ 데이터 가져오기
app.get('/getData', fmcMessage.getData);
// 알람 보내기
// app.get('/pushAlram', fmcMessage.pushAlarm);


app.listen(3000, function () {
    console.log('3000 port listen !!')
})
