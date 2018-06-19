let HttpObj = require('./ShopifyHttpObjects');

const {
    performance,
    PerformanceObserver
} = require('perf_hooks');
const EventEmitter = require('events');

let SiteProxyTester = class SiteProxyTest extends EventEmitter {
    constructor(Url, proxy,ID) {
        super();
        this.ID = ID;
        this.Proxy = proxy;
        this.Performance = performance;
        this.Http = require('req-fast');
        this.BaseUrl = Url;
        this.Agent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.117 Safari/537.36";
        this.Cookies = {};



    }

    async Test( ) {
        return new Promise((resolve, reject) => {



            this.Performance.mark(`Test Start ${this.ID}`);
            let SearchResults = this.Http({

                url: this.BaseUrl,
                trackCookie: true,
                method: "GET",
                cookies: this.Cookies,
                agent: this.Agent,
                proxy: this.Proxy
            });
            let endMarkName = `Test Finished ${this.ID}`;
            let startMarkName = `Test Start ${this.ID}`;
            let measureName = `Test Total ${this.ID}`;

            SearchResults.on('data', function (chunk) {
                this.Performance.mark(`Test Data Recv ${this.ID}`);
            }.bind(this));
            SearchResults.on('end', function (resp) {

                this.Performance.mark(endMarkName);

                performance.measure(measureName,
                    startMarkName,
                    endMarkName);

                resolve();
            }.bind(this));
            SearchResults.on('error', function (error, response) {
                let EndMarkError = `Test Error ${this.ID}`;
                this.Performance.mark(EndMarkError);

                performance.measure(measureName,
                    startMarkName,
                    EndMarkError);
                resolve();
            }.bind(this));
            SearchResults.on('abort', function () {
                let EndMArkAbort = `Test Abort ${this.ID}`;
                this.Performance.mark(EndMArkAbort);

                performance.measure(measureName,
                    startMarkName,
                    EndMArkAbort);
                resolve();
            }.bind(this));
        });
    }


};


module.exports = SiteProxyTester;
