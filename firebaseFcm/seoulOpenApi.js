const axios = require("axios");
const schedule = require('node-schedule');
const moment = require("moment");

const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getFirestore } = require('firebase-admin/firestore');

let serAccount = require('../firebaseFcm/dbcurd-67641-firebase-adminsdk-ax50d-d03370a8af.json');
let spaceDataArr = [];

if (!getApps().length) {
    initializeApp({
        credential: cert(serAccount),
        databaseURL: "https://dbcurd-67641-default-rtdb.firebaseio.com"
    });
}

const db = getFirestore();

// 매일 새벽 3시 실행
const seoulApiJob = schedule.scheduleJob('0 0 3 * * *', function () {
    putSeoulOpenApiSpaces();
})

// 서울 open api 데이터 firebase storage에 저장
async function putSeoulOpenApiSpaces() {
    const spaceDocRef = db.collection('spaces').doc('seoulApiSpaces');

    var date = moment().format('YYYY-MM-DD HH:mm:ss');

    await getSeoulOpenApiSpaces('ListPublicReservationSport'); // 체육대관
    await getSeoulOpenApiSpaces('ListPublicReservationCulture'); // 문화체험
    await getSeoulOpenApiSpaces('ListPublicReservationEducation'); // 교육
    await getSeoulOpenApiSpaces('ListPublicReservationInstitution'); // 시설대관

    if (spaceDataArr.length === 0) {
        return;
    } else {
        await spaceDocRef.set({
            updated: date,
            spaces: spaceDataArr
        });
    }
}

// 서울 open api 요청 후 spaceDataArr 에 저장
async function getSeoulOpenApiSpaces(service) {
    const limit = 100;
    let category = '';
    switch (service) {
        case 'ListPublicReservationSport': // 체육대관
            category = 'SR';
            break;
        case 'ListPublicReservationCulture': // 문화체험
            category = 'C';
            break;
        case 'ListPublicReservationEducation': // 교육
            category = 'E';
            break;
        case 'ListPublicReservationInstitution': // 시설대관
            category = 'R';
            break;
        default:
            return;
    }

    try {
        const response = await axios.get(
            `http://openAPI.seoul.go.kr:8088/4b6e71576773647737344a616f444f/json/${service}/1/${limit}`,
        );

        let listTotalCount = response.data[service]['list_total_count'];
        let repeat = Math.ceil(listTotalCount / limit);

        // 처음 1 ~ limit
        dataRowToArr(response.data[service]['row'], service, category);

        // limit 초과일 경우 반복 처리
        for (let i = 0; i < repeat - 1; i++) {
            try {
                const response = await axios.get(
                    `http://openAPI.seoul.go.kr:8088/4b6e71576773647737344a616f444f/json/${service}/${100 * (i + 1) + 1}/${100 * (i + 2)}`,
                )

                dataRowToArr(response.data[service]['row'], service, category);
            } catch (e) {
                console.log(e);
            }
        }
    } catch (e) {
        console.log(e);
    }
}

function dataRowToArr(data, service, category) {
    data.forEach(space => {
        // uid, 자치구, 장소명, 경도, 위도 유효성 검사
        if (space['SVCID'] == "" || space['AREANM'] == "" || space['PLACENM'] == "" || space['X'] == "" || space['Y'] == "") {
            return;
        }

        // 위도, 경도 유효성 검사
        let lat = parseFloat(space['Y']);
        let long = parseFloat(space['X']);

        if ((lat < 33 && lat > 43) || (long < 124 && long > 132)) {
            return;
        } else {
            lat = parseFloat(lat.toFixed(6));
            long = parseFloat(long.toFixed(6));
        }

        spaceData = {
            uid: space['SVCID'],
            gu: space['AREANM'],
            spaceName: space['PLACENM'],
            category: category,
            latitude: lat,
            longitude: long,
            spaceImage: space['IMGURL'],
            detailInfo: space['MAXCLASSNM'],
            pageLink: space['SVCURL'],
            phoneNum: space['TELNO'],
            svcName: space['SVCNM'],
            svcStat: space['SVCSTATNM'],
            svcTimeMin: space['V_MIN'],
            svcTimeMax: space['V_MAX'],
            payInfo: space['PAYATNM'],
            useTarget: space['USETGTINFO']
        }

        spaceDataArr.push(spaceData);

    });

}

module.exports = seoulApiJob;