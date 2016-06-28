var fs = require('fs');
var moment = require('moment');
var winston = require('winston');

var common = require('../../../core/lib/common');
var misc = require('../../../core/lib/misc');
var connection = require('../../../core/lib/connection');   // todo: can load from CLI modules

var query = require('./query');

var db = require('./database');

// todo: experiment, receive ws push in a guestbook page
function guestbookForm(req, res) {
    var params = {
        title: '방명록',
        page: req.params['plainPage'] || 0
    };

    var mysql = connection.get();
    
    db.readGuestbook(mysql, params.page, function (err, guestbookList) {
        if (err) {
            req.flash('error', {msg: '방명록 정보 읽기에 실패했습니다.'});

            winston.error(err);

            res.redirect('back');
        }

        params.list = guestbookList;

        res.render(BLITITOR.config.site.theme + '/page/guestbook/guest', params);
    });
}

// todo: experiment, bind ajax call and emit event
function registerMessage(req, res) {
    req.assert('email', 'Email as User ID field is not valid').notEmpty().withMessage('User ID is required').isEmail();
    req.assert('password', 'Password must be at least 4 characters long').len(4);
    req.assert('message', 'message is required').len(10).withMessage('Must be 10 chars over').notEmpty();
    
    var errors = req.validationErrors();

    if (errors) {
        req.flash('error', errors);

        return res.redirect('back');
    }

    req.sanitize('nickname').escape();
    req.sanitize('message').escape();

    var hash = common.hash(req.body.password);

    var guestbookData = {
        nickname: req.body.nickname,
        email: req.body.email,
        password: hash,
        message: req.body.message,
        flag: req.body.hidden ? '1' : '',  // todo: subtract common flag module using bitwise
        created_at: new Date()
    };

    var mysql = connection.get();

    // save to guestbook table
    db.writeMessage(mysql, guestbookData, function (err, result) {
        if (err) {
            req.flash('error', {msg: '방명록 정보 저장에 실패했습니다.'});

            winston.error(err);

            res.redirect('back');
        }

        var guestbook_id = result['insertId'];
        winston.info('Saved guestbook id', guestbook_id);

        // save to user table
        req.flash('info', 'Saved Guestbook by ' + (guestbookData.nickname || guestbookData.email));

        var routeTable = misc.routeTable();

        res.redirect(routeTable.guestbook_root);
    });
}

function updateReply(req, res) {

}

module.exports = {
    guestbook: guestbookForm,
    registerMessage: registerMessage,
    registerReply: updateReply
};