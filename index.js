'use strict';

const config = require('./config/config');
const cheerio = require('cheerio');
const request = require('request');
const login = require('facebook-chat-api');
const webshot = require('webshot');
const fs = require('fs');

let deadMachines = [];
const css = 'body{background:white;}.low{background-color:#ff0}.medium{background-color:#F93}.high{background-color:#F33}.dead{background-color:red}';

request('http://www.cmlab.csie.ntu.edu.tw/status/', function (err, res, body) {
    const $ = cheerio.load(body);
    const dead = $('.dead');

    for (let i = 0; i < dead.length; i++) {
        const machineId = dead.eq(i).text();
        if (~config.filter_list.indexOf(machineId)) continue;

        deadMachines.push(machineId);
    }

    // All machines are fine~
    if (!deadMachines.length && !$('.high').length) return;

    // Screenshot
    webshot(body, 'tmp.png', {
        siteType: 'html',
        captureSelector: 'table',
        customCSS: css
    }, function(err) {
        if (err) return console.error(err);

        // login to facebook and send msg to unix manager
        login({
            email: config.user_email,
            password: config.user_password
        }, function (err, api) {
            if (err) return console.error(err);

            const msg = {
                body: '有狀況，請明察。',
                attachment: fs.createReadStream(__dirname + '/tmp.png')
            };

            api.sendMessage(msg, config.notify_channel_id, function (err) {
                console.log('done.');
            });
        });
    });
});
