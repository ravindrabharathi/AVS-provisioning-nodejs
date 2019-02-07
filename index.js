const restify = require('restify');
const plugins = require('restify').plugins;
const errs = require('restify-errors');
const url = require('url');

const request = require('request-promise');

const csvparse = require('csv-parse');

const fs=require('fs');

const util = require('util');


var product_id="";
var client_id="";
var client_secret="";
var code_challenge="";
var dsno="";
var access_token='';
var refresh_token='';


const options1 = {
    uri: 'https://api.amazon.com/auth/o2/token',
    method: 'POST',
    headers: {

        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
    },
    body: {
        grant_type:'authorization_code',
        code:"",
        client_id:"",
        client_secret:"",
        redirect_uri:''
    },
    json: true
};


// Setup Restify Server
const server = restify.createServer();

server.listen(process.env.port || process.env.PORT || 4978, () => {
    console.log('%s listening to %s', server.name, server.url);
});

server.use(restify.plugins.queryParser());

function displayForm(req,res,next) {
   // var data1=[];
   // var data2=[];
    fs.readFile('form1.html', function (err, data) {

        res.writeHead(200, {
            'Content-Type': 'text/html',
            'Content-Length': data.length
        });
        res.write(data);
       // res.write(data2);
        res.end();
    });


}

function processFailure(req,res,next) {

    fs.readFile('fail.html', function (err, data) {

        res.writeHead(200, {
            'Content-Type': 'text/html',
            'Content-Length': data.length
        });
        res.write(data);

        res.end();
    });


}

function processSuccess(req,res,next) {

    fs.readFile('success.html', function (err, data) {

        res.writeHead(200, {
            'Content-Type': 'text/html',
            'Content-Length': data.length
        });
        res.write(data);

        res.end();
    });


}


function processForm(req,res,next) {
    console.log(req.url);
    console.log(req.headers.referer);
    var scope_lwa="alexa:all";
    var scope_data_lwa='{"alexa:all": { "productID":"'+product_id+'","productInstanceAttributes": {"deviceSerialNumber": "'+dsno+'"}}}';
var serv_url="https://www.amazon.com/ap/oa?client_id=";
serv_url += client_id +"&scope="+scope_lwa+"&scope_data="+scope_data_lwa;
serv_url +="&response_type=code&state="+req.headers.referer+"&redirect_uri=";
serv_url+=req.headers.referer+"callbackfunction";
    console.log('processingform');
    res.redirect(encodeURI(serv_url),next);
}

function processAuthResponse(req,res,next) {
    //console.log("authresponse");
    //console.log(decodeURI(req.url));
    var q=url.parse(decodeURI(req.url),true);
    var qdata = q.query;
    if (qdata.code)
    {
        options1.body.redirect_uri=qdata.state+'callbackfunction';
        options1.body.client_id=client_id;
        options1.body.client_secret=client_secret;
        options1.body.code=qdata.code;
        request(options1)
            .then(function (response) {

                access_token=response.access_token;
                refresh_token= response.refresh_token;
                var tokenStr="access_token="+access_token +";||;refresh_token="+refresh_token;
                fs.appendFile('tokens'+new Date().getTime().toString(), tokenStr, function (err) {
                    if (err) {
                        console.log(err.toString())
                    } else {
                        res.redirect('/authorizationsuccess',next);
                    }
                });

                console.log(response.access_token);



            })
            .catch(function (err) {
                // Deal with the error

                /* res.writeHead(200, {
                     'content-type': 'text/plain'
                 });
                 res.write('Authorization failed.\n\n');
                 res.end('Please try again');
                 */
                res.redirect('/authorizationfailed',next);



            })

    }
    else if (qdata.error)
    {
        res.redirect('/authorizationfailed',next);
    }
    else {
        res.redirect('/authorizationfailed',next);
    }



}

function processData()
{



    var csvData=[];
    fs.createReadStream('productData.csv')
        .pipe(csvparse({delimiter: ','}))
        .on('data', function(csvrow) {
            //console.log(csvrow);
            //do something with csvrow
            csvData.push(csvrow);
        })
        .on('end',function() {

            product_id=csvData[1][0];
            //console.log(csvData[1][0]);
            dsno=csvData[1][1];
            code_challenge=csvData[1][2];
            client_id=csvData[1][3];
            client_secret=csvData[1][4];
        });
}

function processImage(req,res,next)
{
    fs.readFile('LWA_btn.png', function (err, data) {

        res.writeHead(200, {
            'Content-Type': 'image/png',
            'Content-Length': data.length
        });
        res.write(data);

        res.end();
    });
}

function sendTestRes(req,res,next){
    res.write("hello from nodejs");
    res.end();
}


//console.log(__dirname);

server.get(/\/docs\/current\/?.*/, restify.plugins.serveStatic({
    directory: __dirname,
    default: 'form1.html'
}));

server.get('/', displayForm);

server.post('/', processForm);

server.get("/callbackfunction", processAuthResponse);

server.get("/authorizationfailed", processFailure);

server.get("/authorizationsuccess", processSuccess);

server.get("/submit_btn", processImage);

server.get("/test_res",processSuccess)

processData();
//console.log(url.href);