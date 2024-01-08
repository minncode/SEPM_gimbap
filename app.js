// 모듈
const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const bodyparser = require('body-parser');
const ejs = require('ejs');

// 라우팅
const userRoute = require('./routes/userRoute');
const adminRoute = require('./routes/adminRoute');

const app = express();

// 앱 세팅
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');


app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyparser.json());
app.use(bodyparser.urlencoded({ extended: true }));

app.use('/', userRoute); // use -> 미들 웨어를 등록해주는 메서드.
app.use('/admin', adminRoute);


app.use((err, req, res, next) => {
  const statusCode = err.status || 500;
  const errorMessage = err.message || 'An unexpected error occurred';

  res.status(statusCode).render('error', {
    message: errorMessage,
    error: app.get('env') === 'development' ? err : {}
  });
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

module.exports = app;
