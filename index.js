'use strict';

const config = require('./config/config');
const Promise = require('bluebird');
const cheerio = require('cheerio');
const request = require('request-promise');
const loginFacebook = Promise.promisify(require('facebook-chat-api'));
const webshot = Promise.promisify(require('webshot'));
const fs = require('fs');

const options = {
    siteType: 'html',
    captureSelector: 'table',
    customCSS: 'body{background:white;}.low{background-color:#ff0}.medium{background-color:#F93}.high{background-color:#F33}.dead{background-color:red}'
};

request('http://www.cmlab.csie.ntu.edu.tw/status/')
    .then(body => {
        const $ = cheerio.load(body);

        // All machines are fine~
        if (!findDeadMachines($('.dead')).length && !$('.high').length) return;

        return webshot(body, 'tmp.png', options);
    })
    .then(() => {
        return loginFacebook({
            email: config.user_email,
            password: config.user_password
        });
    })
    .then(api => {
        const msg = {
            body: '有狀況，請明察。',
            attachment: fs.createReadStream(__dirname + '/tmp.png')
        };

        api.sendMessage(msg, config.notify_channel_id, function (err) {
            console.log('done.');
        });
    })
    .catch(err => {
        console.error(err);
    });



function findDeadMachines(dead) {
    let arr = [];
    for (let i = 0; i < dead.length; i++) {
        const machineId = dead.eq(i).text();
        if (~config.filter_list.indexOf(machineId)) continue;

        arr.push(machineId);
    }

    return arr;
}