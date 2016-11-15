'use strict';

const config = require('./config/config');
const cheerio = require('cheerio');
const request = require('request');
const login = require('facebook-chat-api');

let deadMachines = [];

login({
    email: config.user_email,
    password: config.user_password
}, function (err, api) {
    if (err) return console.error(err);

    request('http://www.cmlab.csie.ntu.edu.tw/status/', function (err, res, body) {
        const $ = cheerio.load(body);
        const dead = $('.dead');

        for (let i = 0; i < dead.length; i++) {
            const machineId = dead.eq(i).text();
            if (~config.filter_list.indexOf(machineId)) continue;

            deadMachines.push(machineId);
        }

        // all machines are fine~
        if (!deadMachines.length) return;

        api.sendMessage(`${deadMachines.toString()} is dead.`, config.notify_channel_id, function (err) {
            console.log(`${deadMachines.toString()} is dead.`);
        });
    });
});
