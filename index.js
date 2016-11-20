'use strict';

const config = require('./config/config');
const Promise = require('bluebird');
const cheerio = require('cheerio');
const table2json = require('tabletojson');
const request = require('request-promise');
const loginFacebook = Promise.promisify(require('facebook-chat-api'));
const webshot = Promise.promisify(require('webshot'));
const fs = require('fs');

const options = {
    siteType: 'html',
    captureSelector: 'table',
    customCSS: 'body{background:white;}.low{background-color:#ff0}.medium{background-color:#F93}.high{background-color:#F33}.dead{background-color:red}'
};

const SWAP_THRESHOLD = 70;
let msg = {};

request('http://www.cmlab.csie.ntu.edu.tw/status/')
    .then(body => {
        const $ = cheerio.load(body);
        const table = table2json.convert(body)[0];
        const dead = deadMachines($('.dead'));
        const swap = highSWAP(table);

        // All machines are fine~
        if (!dead.length && !swap.length) process.exit(0);

        // Summary of status.
        msg.body = '';
        if (dead.length) msg.body += `${dead.toString()} is dead.` + '\n';
        if (swap.length) msg.body += `${swap.map(s => s.host).toString()} Swap > ${SWAP_THRESHOLD}`;

        return webshot(body, 'tmp.png', options);
    })
    .then(() => loginFacebook(config.account))
    .then(api => {
        msg.attachment = fs.createReadStream(__dirname + '/tmp.png');
        api.sendMessage(msg, config.notify_channel_id, function (err) {
            console.log('done.');
            fs.unlink('tmp.png');
        });
    })
    .catch(err => console.error(err));



function deadMachines(dead) {
    let arr = [];
    for (let i = 0; i < dead.length; i++) {
        const machineId = dead.eq(i).text();
        if (~config.filter_list.indexOf(machineId)) continue;

        arr.push(machineId);
    }

    return arr;
}

function highSWAP(table) {
    return table.filter(cml => {
        return Number(cml['Swap (%)']) > SWAP_THRESHOLD;
    });
}
