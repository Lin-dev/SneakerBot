let Profile = {
    "CardNumber": "4859106276039681",
    "Name": "Tom Anderson",
    "Month": 5,
    "Year": 2022,
    "Cvv": "494",
    "LastName": "Anderson",
    "FirstName": "Tom",
    "Address2": "",
    "Address1": "312 Queen St East",
    "State": "ON",
    "City": "Toronto",
    "Email": "don24g@themaster.tech",
    "Country": "Canada",
    "Province": "On",
    "PostalCode": "M5A1S8",
    "Phone": "4172444137",
    "SearchString": "Replicant",
    "RequiredTerms": ["Replicant"],
    "Size": "8",
    "Threads": 3,
    "AntiSearchTerms": ["red"],
    "MaxPurchases": 1,
    "Proxy": [{host: "104.140.209.20", port: 3128}]
};
let Site = new (require('./deadstock.ca'))("1", Profile);
Site.on('Message', console.log);
let TestSearch = async () => {
    var SearchResults = await Site.Search(Profile.SearchString);
    if (!SearchResults) {
        console.log("Got No results at all");
        return;
    }
    let Variant = await Site.ParseResults(SearchResults, Profile.RequiredTerms, Profile.Size, Profile.AntiSearchTerms);
    if (!Variant) {
        console.log("Got No results in size request");
        Variant = await Site.ParseResults(SearchResults, Profile.RequiredTerms, Profile.Size, Profile.AntiSearchTerms, true);
        if (!Variant) {
            console.log("Got No results in wrong size request");
            return;
        }
    }
    let AddedResult = await Site.AddToCart(Variant.variant_id, 2);
    if (!AddedResult) {
        console.log("Got No on add to cart");
        return;
    }
    let Token = await Site.GetPaymentCheckoutToken( );
    if (!Token) {
        console.log("Got No Token");
        return;
    }
    let GetShippingResponse = await Site.GetShippingInfo();
    let RedirectUrl = await Site.SendUserInfo( );
    if (!RedirectUrl) {
        console.log("Got No User SendUserInfo RedirectUrl");
        return;
    }
    let CheckoutResponse = await Site.CheckOut(RedirectUrl,GetShippingResponse,Token)
    {

    }








    return;


};

(async () => {
    await TestSearch()
    console.log('Finished');
})();
