let HttpObj = require('./ShopifyHttpObjects');
const $ = requier('cheerio');
const Enumerable = require('linq');
const BlueBird = require('bluebird');
const EventEmitter = require('events');

let Site = class DeadCaShopify extends EventEmitter {
    constructor(ID, Profile) {
        console.log("Creating Profile " + ID);
        super();

        this.Name = ID;
        this.Profile = Profile;
        this.Http = BlueBird.promisify(require('req-fast'));
        this.BaseUrl = "https://www.deadstock.ca";
        this.Agent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.117 Safari/537.36";
        this.Cookies = {};
        this.Proxy = undefined;// Profile.Proxy[0];
        this.PaymentTokenUrl = "https://elb.deposit.shopifycs.com/sessions";
        this.ShippingProfile = {

            "shipping_address[zip]": Profile.PostalCode,
            "shipping_address[country]": Profile.Country,
            "shipping_address[province]": Profile.Province

        };
        console.log("Shipping profile " + this.ShippingProfile);
        this.UserInfo = {
            "utf8": "\u2713",
            "_method": "patch",
            "authenticity_token": "",
            "previous_step": "contact_information",
            "step": "shipping_method",
            "checkout[email]": Profile.Email,
            "checkout[buyer_accepts_marketing]": "0",
            "checkout[shipping_address][first_name]": Profile.FirstName,
            "checkout[shipping_address][last_name]": Profile.LastName,
            "checkout[shipping_address][company]": "",
            "checkout[shipping_address][address1]": Profile.Address1,
            "checkout[shipping_address][address2]": Profile.Address2,
            "checkout[shipping_address][city]": Profile.City,
            "checkout[shipping_address][country]": Profile.Country,
            "checkout[shipping_address][province]": Profile.Province,
            "checkout[shipping_address][zip]": Profile.PostalCode,
            "checkout[shipping_address][phone]": Profile.Phone,
            "checkout[remember_me]": "0",
            "checkout[client_details][browser_width]": "1710",
            "checkout[client_details][browser_height]": "1289",
            "checkout[client_details][javascript_enabled]": "1",
            "button": ""
        }
        this.CheckOutInfo = {
            "utf8": "\u2713",
            "_method": "patch",
            "authenticity_token": "",
            "previous_step": "payment_method",
            "step": "",
            "s": "",
            "checkout[payment_gateway]": "",
            "checkout[credit_card][vault]": "false",
            "checkout[different_billing_address]": "true",
            "checkout[billing_address][first_name]": Profile.FirstName,
            "checkout[billing_address][last_name]": Profile.LastName,
            "checkout[billing_address][address1]":  Profile.Address1,
            "checkout[billing_address][address2]": Profile.Address2,
            "checkout[billing_address][city]": Profile.City,
            "checkout[billing_address][country]": Profile.Country,
            "checkout[billing_address][province]": Profile.Province,
            "checkout[billing_address][zip]": Profile.PostalCode,
            "checkout[billing_address][phone]": Profile.Phone,
            "checkout[shipping_rate][id]": "",
            "complete": "1",
            "checkout[client_details][browser_width]": 1720,
            "checkout[client_details][browser_height]": 1500,
            "checkout[client_details][javascript_enabled]": "1",
            "g-recaptcha-repsonse": "",
            "button": ""
        }
        console.log("User Info " + this.UserInfo);
        this.CreditCard = {
            number: Profile.CardNumber,
            name: Profile.Name,
            month: Profile.Month,
            year: Profile.Year,
            verification_value: Profile.Cvv
        };
        console.log("CreditCard Info " + this.CreditCard);
    }

    Debug(Error) {
        this.emit('Debug', `${this.Name}:`, Error);
        console.debug(Error);
    }

    Message(Text) {
        this.emit('Message', `${this.Name}: ${Text}`);
        console.log(Text);
    }


    async SendUserInfo() {
        console.log("SendUserInfo ");
        let RedirectUrl;
        try {


            this.Message(`Creating UserInfoResponse`);
            let GetUrlResponse = await this.Http({
                uri: this.BaseUrl + "//checkout.json",
                trackCookie: true,
                method: "GET",
                cookies: this.Cookies,
                proxy: this.Proxy,
                agent: this.Agent,
                headers: {

                    accept: "application/json, text/html, text/*, application/*"
                }
            })

             RedirectUrl = GetUrlResponse.redirects[GetUrlResponse.redirects.length -1];
            this.ProcessCookies(GetUrlResponse.cookies)

            console.log(`SendUserInfo Redirect Url ${RedirectUrl}`);
            let UserInfoResponse = await this.Http({
                data: this.UserInfo,
                uri: RedirectUrl,
                dataType: "form",
                method: "POST",
                timeout:8000,
                maxRedirects:0,

                cookies: this.Cookies,
                proxy: this.Proxy,
                agent: this.Agent,
                headers: {
                  "content-type": "application/x-www-form-urlencoded",
                  accept: "application/json, text/html, text/*, application/*"
                }

            });


            this.ProcessCookies(UserInfoResponse.cookies)
            return RedirectUrl;


        } catch (e) {
            this.Debug(e);
            this.Message(`SendUserInfo Error`);
            return null;
        }
    }

    async Search(SearchString) {
        console.log(`Search `);
        HttpObj.SearchAlese.q = SearchString;
        try {
            this.Message(`Creating Search`);

            let Url = HttpObj.SearchalizeUrl;

            let SearchResults = await this.Http({
                data: HttpObj.SearchAlese,
                uri: Url,
                trackCookie: true,
                method: "GET",
                proxy: this.Proxy,
                cookies: this.Cookies,
                agent: this.Agent,
                headers: {
                    accept: "application/json, text/html, text/*, application/*"
                }

            });

            if (!SearchResults) {
                this.Message(`Search Result was empty.`);
                return null;
            }

            return JSON.parse(SearchResults.body);


        } catch (e) {
            this.Debug(e);
            this.Message(`Search Had Error`);
            return null;
        }
    }

    async ParseResults(Json, SearchTerms, Size, IgnoreKeywords, WrongSizeOk) {
        let WrongSizeMatches = [];
        let VariantIndex = -1;
        let Results = Enumerable.from(Json.items).where((Item) => {
            let Title = Item.title.toLocaleLowerCase()
            if (IgnoreKeywords) {
                for (let i = 0; i < IgnoreKeywords.length; i++) {
                    let IgnoreWord = IgnoreKeywords[i];
                    if (Title.indexOf(IgnoreWord) >= 0)
                        return false;
                }
            }
            if (SearchTerms) {
                for (let i = 0; i < SearchTerms.length; i++) {
                    let SearchWord = SearchTerms[i].toLocaleLowerCase();
                    if (!(Title.indexOf(SearchWord) >= 0))
                        return false;
                }
            }
            let Variants = Item.shopify_variants;
            for (let i = 0; i < Variants.length; i++) {
                let Variant = Variants[i];
                if (Variant.options["US Size"] == Size) {
                    VariantIndex = i;
                    return true;
                }
                else {
                    if (WrongSizeOk) {
                        WrongSizeMatches.push(Variant);
                    }
                }
            }

        });
        let Result = Results.firstOrDefault();
        if (!Result && WrongSizeMatches.length > 0) {
            return WrongSizeMatches[Math.floor(Math.random() * WrongSizeMatches)];
        }
        return Result.shopify_variants[VariantIndex];

    }

    async AddToCart(VariantID, Quantity) {
        let CartLink = this.BaseUrl + "/cart/" + VariantID + ":1";

        try {
            let CartLinkResult = await this.Http({
                uri: CartLink,
                trackCookie: true,
                method: "GET",
                cookies: this.Cookies,
                proxy: this.Proxy,
                agent: this.Agent,
                headers: {
                    accept: "application/json, text/html, text/*, application/*"
                }
            });
            await  this.ProcessCookies(CartLinkResult.cookies);
            let PostParams =
                {
                    "id": VariantID,
                    "quantity": Quantity
                };
            var AddtoCartLink = this.BaseUrl + "/cart/add.js";
            let AddToCartResult = await this.Http({
                uri: AddtoCartLink,
                trackCookie: true,
                method: "POST",
                proxy: this.Proxy,
                cookies: this.Cookies,
                agent: this.Agent,
                data: PostParams,
                headers: {
                    accept: "application/json, text/html, text/*, application/*"
                }
            });
            if (AddToCartResult) {
                var AddedToCart = JSON.parse(AddToCartResult.body);
                await  this.ProcessCookies(AddToCartResult.cookies)
                if (AddedToCart && AddedToCart.id) {
                    return AddedToCart.id;
                }
                return AddtoCartLink;
            }
            return null;
        } catch (E) {
            if (E.statusCode == 430) {
                this.Message("Ip was blocked");
            } else {
                this.Debug(E);
            }
            return null;
        }
    }

    async GetPaymentCheckoutToken() {

        try {
            let GetCheckoutTokenRequst = await this.Http({
                uri: this.PaymentTokenUrl,
                dataType: "json",
                trackCookie: true,
                method: "POST",
                proxy: this.Proxy,
                cookies: this.Cookies,
                agent: this.Agent,
                data: this.CreditCard,
                headers: {
                    accept: "application/json, text/html, text/*, application/*"
                }
            });

            await this.ProcessCookies(GetCheckoutTokenRequst.cookies);
            if (!GetCheckoutTokenRequst) return null;
            return GetCheckoutTokenRequst.body.id;

        } catch (e) {
            this.Message("Error During GetCheckoutToken");
            this.Debug(e);
            return null;
        }
    }

    async GetShippingInfo() {

        let GetShippingResponse;
        let ShipRatesLink;
        try {
            ShipRatesLink = "https://www.deadstock.ca//cart/shipping_rates.json?";
            let Qs = Object.keys(this.ShippingProfile).map((key) => {
                return encodeURIComponent(key) + '=' + encodeURIComponent(this.ShippingProfile[key])
            }).join('&');


            GetShippingResponse = await this.Http({
                uri: "https://www.deadstock.ca//cart/shipping_rates.json?shipping_address%5Bzip%5D=M5A1S8&shipping_address%5Bcountry%5D=Canada&shipping_address%5Bprovince%5D=On",
                trackCookie: true,
                cookies: this.Cookies,
                method: "GET",
                proxy: this.Proxy,
                agent: this.Agent,
                headers: {
                    accept: "application/json, text/html, text/*, application/*"
                }


            });
            let body = GetShippingResponse.body;
            if (!body || !body.shipping_rates) {
                this.Message("Could not Get Shipping Response");
                return null;
            }
            if (body.shipping_rates.length == 0) {
                this.Message("No Valid Shipping options");
                return null;
            }
            await this.ProcessCookies(GetShippingResponse.cookies);

            return {
                ship_prc: body.shipping_rates[0].price,
                ship_opt: body.shipping_rates[0].name
            }


        } catch (e) {
            this.Message("Error During GetShippingInfo");
            this.Debug(e);
            return null;
        }
    }

    async CheckOut(CheckoutUrl,ShippingToken,PaymentToken)
    {
        let Url = CheckoutUrl + "?step=payment_method";
        let GetCheckOutResponse1;
        try {


            GetCheckOutResponse1 = await this.Http({
                uri: Url,
                trackCookie: true,
                cookies: this.Cookies,
                method: "GET",
                proxy: this.Proxy,
                agent: this.Agent,
                headers: {
                    accept: "application/json, text/html, text/*, application/*"
                }


            });
            let body = GetCheckOutResponse1.body;
            let Cher= $.load(body);
            let Items = Cher('.radio__input');
            if(Items.length == 0){
                this.Message("Check out fail, couldn't find proper inputs");
                return null;
            }
            let Gateway = Items[0].val();
            if (!body || !body.shipping_rates) {
                this.Message("Could not Get Shipping Response");
                return null;
            }
            if (body.shipping_rates.length == 0) {
                this.Message("No Valid Shipping options");
                return null;
            }
            await this.ProcessCookies(GetShippingResponse.cookies);

            return {
                ship_prc: body.shipping_rates[0].price,
                ship_opt: body.shipping_rates[0].name
            }


        } catch (e) {
            this.Message("Error During GetShippingInfo");
            this.Debug(e);
            return null;
        }
    }

    async ProcessCookies(NewCookies) {

        if (!NewCookies) return;
        var Keys = Object.keys(NewCookies);
        for (var i = 0; i < Keys.length; i++) {
            this.Cookies[Keys[i]] = NewCookies[Keys[i]];
        }
    }
};


module.exports = Site;
