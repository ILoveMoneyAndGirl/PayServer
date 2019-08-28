const mongoose = require('mongoose');
const setting = require('../config/setting');




 mongoose.connect('mongodb://' + setting.USERNAME + ':' + setting.PASSWORD + '@' + setting.HOST + ':' + setting.PORT + '/' + setting.DB + '', {
        useMongoClient: true
    });

mongoose.Promise = global.Promise;
const db = mongoose.connection;

db.once('open', () => {
    console.log('connect mongodb success')
})

db.on('error', function (error) {
    console.error('Error in MongoDb connection: ' + error);
    mongoose.disconnect();
});

db.on('close', function () {
    console.log('数据库断开，重新连接数据库');
});


exports.PayUrl = require('./PayUrl');
exports.PayProduct = require('./PayProduct');
exports.PayRecord = require('./PayRecord');
exports.AdminUserBalance=require('./AdminUserBalance');
exports.DB=db
//DoraModelEnd