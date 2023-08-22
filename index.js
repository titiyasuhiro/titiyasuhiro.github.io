window.isAuthenticated = 1;
window.clientUserId = 1476038;
window.clientUserName = '968161e2-b953-4f3f-b280-fd0fd692f087';
window.userCountryCode = 'fr';
window.logPageEvent = 1;
window.userHasAdsParams = 1;
window.utmSourceFromReferrer = 0;
window.currentLang = '';
window.baseUrl = 'html-templates';
window.currentUrl = 'html-templates';
window.np_userId = '';
window.isAmplitudeInitialized = false;
window.sha256Email = '6d873f5b03c598965ba841970f738d53ac41b68c10f4016b1adb56a3cd0b1335';

function sendAnalyticsData(eventType, props, cb) {
    let json = { data: {} };
    json.userToken = np_userId;
    json.data.adsParams = $.cookie('AdsParameters');
    json.data.ga = $.cookie('_ga');
    json.data.gac = $.cookie('_gac_UA-88868916-2');
    json.data.userAgent = navigator.userAgent;
    json.data.eventType = eventType;
    json.data.props = props;
    $.ajax({
        'type': 'POST',
        'url': '/Feedback/SendAdsLog',
        'contentType': 'application/json; charset=utf-8',
        'data': JSON.stringify(json),
        'dataType': 'json',
        'complete': cb || function() {}
    });
}

function initializeAmplitudeUser() {
    if (isAmplitudeInitialized) {
        return;
    }
    let isAmplitudeInitialized = true;

    if (clientUserId > 0)
    {
        identifyAmplitudeUser(clientUserId, clientUserName);
    }
    else
    {
        identifyAmplitudeUser(null);
    }
}

function sendAmplitudeAnalyticsData(eventName, eventProperties, userProperties, callback_function) {
    initializeAmplitudeUser();

    if (userProperties) {
        if(userProperties.utm_source || userProperties.utm_campaign) {
            let identify = new amplitude.Identify();
            identify.setOnce("utm_campaign", userProperties.utm_campaign);
            identify.setOnce("utm_source", userProperties.utm_source);
            identify.setOnce("utm_content", userProperties.utm_content);
            identify.setOnce("utm_term", userProperties.utm_term);
            identify.setOnce("utm_page", userProperties.utm_page);
            identify.setOnce("utm_page2", userProperties.utm_page);
            identify.setOnce("referrer", userProperties.referrer);

            amplitude.getInstance().identify(identify);

            userProperties.utm_source_last = userProperties.utm_source;
            userProperties.utm_campaign_last = userProperties.utm_campaign;
            userProperties.utm_content_last = userProperties.utm_content;
            userProperties.utm_term_last = userProperties.utm_term;
            userProperties.utm_page_last = userProperties.utm_page;
        }

        let userProps = objectWithoutProperties(userProperties, ["utm_campaign", "utm_source","utm_content", "utm_term", "utm_page", "referrer"]);
        amplitude.getInstance().setUserProperties(userProps);
    }

    eventProperties.WebSite = 'true';
    eventProperties.IsAuthenticated = window.isAuthenticated;
    eventProperties.country_code = getCountryCode();
    eventProperties.lang = window.currentLang || '';

    let fullPageUrl = window.location.pathname.split('?')[0];
    eventProperties.full_page_url = fullPageUrl;
    eventProperties.page_url = clearPageUrl(fullPageUrl);

    if (typeof callback_function === 'function') {
        amplitude.getInstance().logEvent(eventName, eventProperties, callback_function);
    } else {
        amplitude.getInstance().logEvent(eventName, eventProperties);
    }
}

function identifyAmplitudeUser(userId, token) {
    if (userId) {
        amplitude.getInstance().setUserProperties({
            "Token": token,
            "UserId": userId
        });
    }

    let identify = new amplitude.Identify();
    amplitude.getInstance().identify(identify);
    if (userId) {
        amplitude.getInstance().setUserId(userId);
    }
}

function sendAnalyticsFromUrl(referrer, pageType) {
    let hash = window.location.hash;

    let urlIsAvailable = typeof URL === "function" || (navigator.userAgent.indexOf('MSIE') !== -1 && typeof URL === 'object');
    if (!urlIsAvailable) {
        return;
    }

    let url = new URL(window.location.href);
    if (hash && hash.indexOf('utm_') >= 0) {
        url = new URL(window.location.origin + window.location.pathname + hash.replace('#', '?'));
    }

    if (!url.searchParams) {
        return;
    }

    let utmParams = getUtmParams(url);
    let gclidFromUrl = utmParams.gclid;
    let utmParamsFromUrl = !!utmParams.utmSource || !!utmParams.utmCampaign || !!utmParams.gclid;
    if (!utmParamsFromUrl && userHasAdsParams)
    {
        utmParams = getUtmParamsFromCookie();
    }

    let canLog = canLogToAmplitude();
    if (utmParamsFromUrl || utmSourceFromReferrer) {
        let fullPageUrl = window.location.pathname.split('?')[0];
        let pageUrl = clearPageUrl(fullPageUrl);
        let userProps = {
            "utm_source": utmParams.utmSource,
            "utm_campaign": utmParams.utmCampaign,
            "utm_content": utmParams.utmContent,
            "utm_term": utmParams.utmTerm,
            "utm_page": getUtmPageValue(pageUrl),
            "utm_lang": window.currentLang || '',
            "referrer": referrer
        };

        if (gclidFromUrl) {
            let landingUrl = pageUrl.startsWith('/') && pageUrl !== '/' ? pageUrl.substr(1) : pageUrl;
            userProps.landing_page = landingUrl;

            let event = {
                'Page': landingUrl,
                'Url': window.location.href,
                'utm_campaign_event': utmParams.utmCampaign
            }
            sendAmplitudeAnalyticsData('Landing Page', event, userProps);
        } else {
            let eventProps = {
                "utm_source": utmParams.utmSource,
                "utm_campaign": utmParams.utmCampaign,
                "utm_content": utmParams.utmContent,
                "utm_term": utmParams.utmTerm
            };

            if (utmParams.utmSource === "elastic") {
                sendAmplitudeAnalyticsData('Email Click', eventProps);
            }

            if (canLog) {
                sendAmplitudeAnalyticsData('Campaign', eventProps, userProps);
            }
        }
    }

    if (logPageEvent && canLog || (pageType === 'Pricing Page' && !window.isForbiddenCountry())) {
        let pageEventProps = {
            'type': pageType,
            'accepted_country': isValidCountry(),
            'force_log': !canLog
        };

        sendAmplitudeAnalyticsData('Page View', pageEventProps);
    }
}

document.addEventListener('DOMContentLoaded', function () {
    setCountryCode('https://location.nicepagesrv.com/country');
    setUserIdCookie();
    updatePageViewCounter();

    if (typeof gtag === 'function' && typeof canSendViewConversion === 'function' && window.isAuthenticated && canSendViewConversion()) {
        if (sha256Email) {
            gtag('set', 'user_data', { 'sha256_email_address': sha256Email });
        }
        //Event snippet for 2 Page View conversion page
        gtag('event', 'conversion', { 'send_to': 'AW-797221335/GbWrCJ6Ht5wYENfDkvwC', 'transaction_id': clientUserId });

        setAdsPageViewCookie();
    }

    let referrer = '';
    let pageType = 'Template Page Preview';
    sendAnalyticsFromUrl(referrer, pageType);

    if (location.href.indexOf('/frame/') === -1) {
        PureCookie.initCookieConsent({
            description: 'By using this website, you automatically accept that we use cookies. Learn more about our ',
            link: '<a href="https://nicepage.com/Privacy" target="_blank"> privacy and cookies policy</a>.',
            buttonCaption: "Accept",
            opacity: 0.88,
        });
    }
});

window.dataLayer = window.dataLayer || [];
function gtag() { dataLayer.push(arguments); }
gtag('js', new Date());

let options = {};
let awOptions = { 'allow_enhanced_conversions': true };
if (clientUserId > 0) {
    options.user_id = clientUserId;
    awOptions.user_id = clientUserId;
}

gtag('config', 'AW-797221335', awOptions);
gtag('config', 'G-T7WWB0T53W', options);

/*Facebook Pixel Code*/
if(window.hideFacebookPixelCode !== true) {
    !function (f, b, e, v, n, t, s) {
        if (f.fbq) return; n = f.fbq = function () {
            n.callMethod ?
                n.callMethod.apply(n, arguments) : n.queue.push(arguments)
            };
        if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0';
        n.queue = []; t = b.createElement(e); t.async = !0;
        t.src = v; s = b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t, s)
    }(window, document, 'script',
        'https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', '251025992170426', {
        em: '6d873f5b03c598965ba841970f738d53ac41b68c10f4016b1adb56a3cd0b1335'
    });
    fbq('track', 'PageView');
}
/*End Facebook Pixel Code*/

/*Amplitude Code*/
type="text/javascript">
        (function(e,t){let n=e.amplitude||{_q:[],_iq:{}};let r=t.createElement("script")
                ;r.type="text/javascript"
                ;r.integrity="sha384-d/yhnowERvm+7eCU79T/bYjOiMmq4F11ElWYLmt0ktvYEVgqLDazh4+gW9CKMpYW"
                ;r.crossOrigin="anonymous";r.async=true
                ;r.src="https://cdn.amplitude.com/libs/amplitude-5.2.2-min.gz.js"
                ;r.onload=function(){if(!e.amplitude.runQueuedFunctions){
                    console.log("[Amplitude] Error: could not load SDK")}}
                ;let i=t.getElementsByTagName("script")[0];i.parentNode.insertBefore(r,i)
                ;function s(e,t){e.prototype[t]=function(){
                this._q.push([t].concat(Array.prototype.slice.call(arguments,0)));return this}}
            let o=function(){this._q=[];return this}
                ;let a=["add","append","clearAll","prepend","set","setOnce","unset"]
                ;for(let u=0;u<a.length;u++){s(o,a[u])}n.Identify=o;let c=function(){this._q=[]
                    ;return this}
                ;let l=["setProductId","setQuantity","setPrice","setRevenueType","setEventProperties"]
                ;for(let p=0;p<l.length;p++){s(c,l[p])}n.Revenue=c
                ;let d=["init","logEvent","logRevenue","setUserId","setUserProperties","setOptOut","setVersionName","setDomain","setDeviceId","setGlobalUserProperties","identify","clearUserProperties","setGroup","logRevenueV2","regenerateDeviceId","groupIdentify","onInit","logEventWithTimestamp","logEventWithGroups","setSessionId","resetSessionId"]
                ;function v(e){function t(t){e[t]=function(){
                    e._q.push([t].concat(Array.prototype.slice.call(arguments,0)))}}
                for(let n=0;n<d.length;n++){t(d[n])}}v(n);n.getInstance=function(e){
                    e=(!e||e.length===0?"$default_instance":e).toLowerCase()
                        ;if(!n._iq.hasOwnProperty(e)){n._iq[e]={_q:[]};v(n._iq[e])}return n._iq[e]}
                ;e.amplitude=n})(window,document);
        amplitude.getInstance().init("878f4709123a5451aff838c1f870b849");

    let shareasaleSSCID=shareasaleGetParameterByName("sscid");

    function shareasaleSetCookie(e,a,r,s,t){
        if(e&&a){
            let o,n=s?"; path="+s:"",i=t?";domain="+t:"",S="";
            r&&((o=new Date).setTime(o.getTime()+r),S=""); expires="+o.toUTCString()),document.cookie=e+"="+a+S+n+i+"; 
            SameSite=None;Secure}}
    function shareasaleGetParameterByName(e,a){a||(a=window.location.href),e=e.replace(/[\[\]]/g,"\\$&");
        let r=new RegExp("[?&]"+e+"(=([^&#]*)|&|#|$)").exec(a);
        return r?r[2]?decodeURIComponent(r[2].replace(/\+/g," ")):"":null}shareasaleSSCID&&shareasaleSetCookie("shareasaleSSCID",shareasaleSSCID,94670778e4,"/");

        let device = 'desktop';
        function init($) {
            $('#previewDesktopBtn').click(function (e) {
                setLivePreviewFrameSize($(this));
                setActiveResponsiveButton(this);
                e.preventDefault();
            });

            $('#previewLaptopBtn').click(function (e) {
                setLivePreviewFrameSize($(this));
                setActiveResponsiveButton(this);
                e.preventDefault();
            });
            $('#previewTabletBtn').click(function (e) {
                setLivePreviewFrameSize($(this));
                setActiveResponsiveButton(this);
                e.preventDefault();
            });
            $('#previewPhoneHorizontalBtn').click(function (e) {
                setLivePreviewFrameSize($(this));
                setActiveResponsiveButton(this);
                e.preventDefault();
            });
            $('#previewPhoneBtn').click(function (e) {
                setLivePreviewFrameSize($(this));
                setActiveResponsiveButton(this);
                e.preventDefault();
            });

            detectActiveResponsiveButton();
        }

        if (jQuery.isReady) {
            init(jQuery);
        } else {
            jQuery(function ($) {
                init($);
            });
        }

        function setActiveResponsiveButton(btn) {
            $(".page-preview-header > a").removeClass("active");
            $(btn).addClass("active");
        }

        function detectActiveResponsiveButton() {
            let d = device;
            if (!d) {
                d = 'desktop';
            }
            $("#preview" + d.charAt(0).toUpperCase() + d.substring(1) + "Btn").click();
        }

        function getDataPreviewSizeAttr(el) {
            return el.closest("[data-preview-size]").attr("data-preview-size");
        }

        function setLivePreviewFrameSize(srcEl) {
            let getScrollbarWidth = function () {
                let s = $('<div style="width:100px;height:100px;overflow:scroll;visibility:hidden;position:absolute;top:-99999px"><div style="height:200px;"></div></div>')
                    .appendTo("body");
                let res = s.width() - s.find("div").last().width();
                s.remove();
                return res;
            };
            let attr = getDataPreviewSizeAttr(srcEl);
            $('#livePreviewFrame').width(attr.indexOf("%") !== -1 ? attr : parseInt(attr, 10) + getScrollbarWidth());
        }

        if (window.parent) {
            let _w = 0, _h = 0;
            let updateFormSize = function () {
                let form = $('form.shaped-form-extended,form.shaped-form');
                let w = form.outerWidth(true);
                let h = form.outerHeight(true);
                if (Math.abs(_w - w) > 5 || Math.abs(_h - h) > 5) {
                    _w = w;
                    _h = h;
                    let msg = { key: 'login-frame-size', width: w, height: h };
                    window.parent.postMessage(msg, "*");}
                setTimeout(updateFormSize, 300);
            }
            updateFormSize();
        }
    
type="application/ld+json">{
    "@context": "http://schema.org",
    "@type": "Organization",
    "name": "",
    "url": "https://website473779.nicepage.io/Page-5.html",
    "logo": "//images01.nicepage.com/c461c07a441a5d220e8feb1a/ef41c52696c759f7b9758a68/ttt.png"
}

