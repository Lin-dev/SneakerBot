let SiteProxyTester = require("./ProxyTest");
const {
    performance,
    PerformanceObserver
} = require('perf_hooks');

let Proxies = [{
    host: '192.126.161.203',  // host
    port: 3128,         // port
    //proxyAuth: 'user:password'  // authentication if necessary.
}, {
    host: '192.126.161.203',  // host
    port: 3128,         // port
    //proxyAuth: 'user:password'  // authentication if necessary.
}];

let SitetoTest = "https://www.deadstock.ca";
let Tests = [];
let Test1 = async () => {

    const obs = new PerformanceObserver((list, observer) => {
        var Entries = list.getEntries();
        for (var i = 0; i < Entries.length; i++) {
            console.log(JSON.stringify((Entries[i])))
        }

    });
    obs.observe({entryTypes: ['mark', 'measure']});
    performance.clearMarks();
    performance.clearMeasures();

    for (var i = 0; i < Proxies.length; i++) {
        let SiteProxyTest = new SiteProxyTester(SitetoTest, Proxies[i], Proxies[i].host + ":" + Proxies[i].port);
        Tests.push(SiteProxyTest.Test());
    }

    await Promise.all(Tests);
};

(async () => {
    console.log("------------------------------")
    console.log("--------Starting Test 1-------")
    await Test1();

})();