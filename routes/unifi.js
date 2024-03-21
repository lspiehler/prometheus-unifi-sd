var express = require('express');
var router = express.Router();
var url = require("url");
const https = require('../lib/http');
var credentialcache = {
    /*"https://10.1.0.1": {
        token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJkODNiZGM5ZS03ZjIxLTQ4NzUtYTVjYy00ZTc1ZjMzOTVmMTkiLCJwYXNzd29yZFJldmlzaW9uIjowLCJpc1JlbWVtYmVyZWQiOmZhbHNlLCJjc3JmVG9rZW4iOiJmY2M3NDllZC00NDNkLTRjYzEtOTAxMi02NzMyYzQwYWFiYzMiLCJpYXQiOjE3MTEwMjA1NDUsImV4cCI6MTcxMTAyNzc0NSwianRpIjoiNDNmZmJhMDItNjUyZC00ZjhlLTlhMDEtOWI3MzM3NzE1NDg4In0.zlx9UyfbKG2QwskqIlPW8s2SOXF4ZrNYWGA66NBG_nE",
        expiration: 1711027745770
    }*/
}
//http://10.1.8.111:3005/metrics?type=uap&labels=type,model,name,mac

var cookieParser = function(cookieString) {
 
    // Return an empty object if cookieString
    // is empty
    if (cookieString === "")
        return {};
 
    // Get each individual key-value pairs
    // from the cookie string
    // This returns a new array
    let pairs = cookieString.split(";");
 
    // Separate keys from values in each pair string
    // Returns a new array which looks like
    // [[key1,value1], [key2,value2], ...]
    let splittedPairs = pairs.map(cookie => cookie.split("="));
 
 
    // Create an object with all key-value pairs
    const cookieObj = splittedPairs.reduce(function (obj, cookie) {
 
        // cookie[0] is the key of cookie
        // cookie[1] is the value of the cookie 
        // decodeURIComponent() decodes the cookie 
        // string, to handle cookies with special
        // characters, e.g. '$'.
        // string.trim() trims the blank spaces 
        // auround the key and value.
        if(cookie.length > 1) {
            obj[decodeURIComponent(cookie[0].trim())]
                = decodeURIComponent(cookie[1].trim());
        } else {
            obj[decodeURIComponent(cookie[0].trim())]
                = true;
        }
 
        return obj;
    }, {})
 
    return cookieObj;
}

var credentialHandler = function(params, force, callback) {
    //console.log(params);
    //console.log(force);
    //console.log(params);
    //callback('currently testing', false);
    //return;
    //return;
    if(credentialcache.hasOwnProperty(params.query.target) && force == false) {
        let time = new Date().getTime();
        //console.log(time);
        if(credentialcache[params.query.target].expiration - 300000 > time) {
            console.log('credentials are cached and valid');
            callback(false, credentialcache[params.query.target]);
        } else {
            console.log('credentials are cached and expired');
            credentialHandler(params, true, callback);
        }
    } else {
        console.log('failed to find credentials in cache');
        //callback('test2', false);
        //return;
        let body = {
            username: params.creds.username,
            password: params.creds.password
        }
        let options = {
            host: params.url.host,
            port: params.url.port,
            path: '/api/auth/login',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        }
        https.request({ options: options, body: body }, function(err, resp) {
            if(err) {
                console.log(err);
                callback(err, false);
            } else {
                resp.body = JSON.parse(resp.body);
                if(resp.body.hasOwnProperty('code')) {
                    callback(resp.body.message, false);
                } else {
                    //console.log(req.headers);
                    //console.log(resp.headers);
                    //console.log(resp.headers['set-cookie'][0]);
                    //console.log(JSON.parse(resp.body));
                    let cookie = cookieParser(resp.headers['set-cookie'][0]);
                    let token = {
                        token: cookie.TOKEN,
                        expiration: resp.headers['x-token-expire-time']
                    }
                    credentialcache[params.query.target] = token;
                    //console.log(token);
                    callback(false, token);
                }
            }
        });
        //callback('failed to find credentials', false);
    }
}

router.get('/', function(req, res, next) {
    if (!req.headers.authorization || req.headers.authorization.indexOf('Basic ') === -1) {
        res.setHeader("WWW-Authenticate", "Basic realm=\"prometheus-unifi-sd\"");
        //res.setHeader("HTTP/1.0 401 Unauthorized");
        res.status(401).json({
            error: {
                code: 401,
                message: 'Missing Authorization Header'
            }
        });
        return;
    }
    let parsecreds = Buffer.from(req.headers.authorization.substring(6), 'base64').toString().split(':')
    let creds = {
        username: parsecreds[0],
        password: parsecreds[1]
    }
    //let bufferObj = Buffer.from(req.headers.authorization.substring(6), "utf8");
    //console.log(creds);
    let targeturl;
    if(req.query.hasOwnProperty('target') === false) {
        res.status(400).json({
            error: {
                code: 400,
                message: 'A target must be specified'
            }
        });
        return;
    } else {
        targeturl = url.parse(req.query.target);
        //console.log(targeturl);
        if(targeturl.protocol!='https:') {
            res.status(400).json({
                error: {
                    code: 400,
                    message: 'Target should be an https URL'
                }
            });
            return;
        }
        if(targeturl.port) {
            //port = targeturl.port
        } else {
            targeturl.port = 443;
        }
    }
    credentialHandler({query: req.query, creds: creds, url: targeturl}, false, function(err, cred) {
        if(err) {
            res.setHeader("WWW-Authenticate", "Basic realm=\"prometheus-unifi-sd\"");
            //res.setHeader("HTTP/1.0 401 Unauthorized");
            res.status(401).json({
                error: {
                    code: 401,
                    message: err
                }
            });
            return;
        } else {
            /*res.status(400).json({
                error: {
                    code: 400,
                    message: 'Currently testing'
                }
            });
            return;*/
            let options = {
                host: targeturl.host,
                port: targeturl.port,
                path: '/proxy/network/api/s/default/stat/device',
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Cookie': 'TOKEN=' + cred.token
                }
            }
            https.request({ options: options }, function(err, resp) {
                resp.body = JSON.parse(resp.body);
                if(resp.body.hasOwnProperty('error')) {
                    res.status(resp.body.error.code).json(resp.body)
                } else {
                    let labels = [];
                    if(req.query.hasOwnProperty('debug') === true) {
                        res.json(resp.body);
                    } else {
                        if(req.query.hasOwnProperty('labels') === true) {
                            labels = req.query.labels.split(',')
                        }
                        //console.log(labels);
                        if(req.query.hasOwnProperty('type') === true) {
                            let targets = [];
                            for(let i = 0; i < resp.body.data.length; i++) {
                                if(resp.body.data[i].type == req.query.type) {
                                    let target = {
                                        targets: [resp.body.data[i].ip]
                                    }
                                    if(labels.length > 0) {
                                        target['labels'] = {};
                                        for(let j = 0; j < labels.length; j++) {
                                            if(resp.body.data[i].hasOwnProperty(labels[j])) {
                                                target['labels'][labels[j]] = resp.body.data[i][labels[j]];
                                            }
                                        }
                                    }
                                    targets.push(target);
                                }
                            }
                            res.setHeader('X-Prometheus-Refresh-Interval-Seconds', '60');
                            res.json(targets);
                        } else {
                            res.status(400).json({
                                error: {
                                    code: 400,
                                    message: 'A device type must be specified'
                                }
                            });
                        }
                    }
                }
            });
        }
    });
});

module.exports = router;
