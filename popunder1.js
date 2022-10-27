/**
 * Smart Popunder maker.
 * This class provides an easy way to make a popunder.
 * Avoid blocked on Google Chrome
 *
 * Note: For Google Chrome, to avoid blocked so each popunder will be  fired by each click.
 *
 * @author: Phan Thanh Cong aka chiplove <ptcong90@gmail.com>
 * @license: MIT
 *
 * Changelog
 * version 2.0; Jan 11, 2015
 * - rewrite
 *
 * version 2.1; Jan 22, 2015
 * - improved, fixed pop on tab/window always be focused (still issues on firefox, safari if use newtab)
 *
 * version 2.2; Mar 06, 2015
 * - update for google chrome 41.x (fire popunder ok, but can't blur now)
 *
 * version 2.3; Mar 23, 2015
 * - Add new options beforeOpen, afterOpen callback.
 *
 * version 2.3.1; Mar 28, 2015
 * - Fix merge options in IE 7, fix some issues in IE 11.
 *
 * version 2.3.2; Apr 1, 2015
 * - Fix parse browser infomartions.
 *
 * version 2.4.0; May 15, 2015
 * - Make popunder (blur + !newTab) works on Firefox, Chrome 41 with flash
 * - Remove `smart`, `blurByAlert` options
 *
 * version 2.4.1; May 16, 2015
 * - Fix forgot remove flash after popuped
 * - Beauty some code
 *
 * version 2.4.2; May 18, 2015
 * - Fix removing flash issue on Chrome.
 *
 * version 2.4.3; May 19, 2015
 * - Make popup (blur + newTab) works on Firefox 38+, Chrome 41+, IE 11
 *
 * version 2.4.4; May 20, 2015
 * - Make popunder works on Mobile (tested with iOS)
 * - Fix issue with multiple (newTab + blur) pops (Firefox 38+, Chrome 43)
 */
(function(window) {
    'use strict';

    var debug = false,
    counter = 0,
    lastPopTime = 0,
    baseName = 'SmartPopunder',
    parent = top != self ? top : self,
    userAgent = navigator.userAgent.toLowerCase(),
    browser = {
        win: /windows/.test(userAgent),
        mac: /macintosh/.test(userAgent),
        mobile: /iphone|ipad|android/.test(userAgent),
        webkit: /webkit/.test(userAgent),
        mozilla: /mozilla/.test(userAgent) && !/(compatible|webkit)/.test(userAgent),
        chrome: /chrome/.test(userAgent),
        msie: /msie|trident\//.test(userAgent) && !/opera/.test(userAgent),
        firefox: /firefox/.test(userAgent),
        safari: /safari/.test(userAgent) && !/chrome/.test(userAgent),
        opera: /opera/.test(userAgent),
        version: parseInt(userAgent.match(/(?:[^\s]+(?:ri|ox|me|ra)\/|trident\/.*?rv:)([\d]+)/i)[1], 10)
    },
    helper = {
        simulateClick: function(url) {
            var a = this.createElement('a', {href: url || 'data:text/html,<script>window.close();<\/script>;'}),
                evt = document.createEvent('MouseEvents');
            document.body.appendChild(a);
            evt.initMouseEvent('click', true, true, window, 0, 0, 0, 0, 0, true, false, false, true, 0, null);
            a.dispatchEvent(evt);
            a.parentNode.removeChild(a);
        },
        blur:  function(popunder) {
            if (browser.mobile) return;

            try {
                popunder.blur();
                popunder.opener.window.focus();
                window.self.window.focus();
                window.focus();
                if (browser.firefox) {
                    this.openCloseWindow(popunder);
                } else if (browser.webkit) {
                    // try to blur popunder window on chrome
                    // but not works on chrome 41
                    // so we should wrap this to avoid chrome display warning
                    if (!browser.chrome || (browser.chrome && browser.version < 41)) {
                        this.openCloseTab();
                    }
                } else if (browser.msie) {
                    setTimeout(function() {
                        popunder.blur();
                        popunder.opener.window.focus();
                        window.self.window.focus();
                        window.focus();
                    }, 1000);
                }
            } catch (err) {}
        },
        createElement: function(tag, attrs, text) {
            var element = document.createElement(tag);
            for (var i in attrs) {
                element.setAttribute(i, attrs[i]);
            }
            if (text) {
                element.innerHTML = innerHTML;
            }
            return element;
        },
        openCloseWindow: function(popunder) {
            var tmp = popunder.window.open('about:blank');
            tmp.focus();
            tmp.close();
            setTimeout(function() {
                try {
                    tmp = popunder.window.open('about:blank');
                    tmp.focus();
                    tmp.close();
                } catch (e) {}
            }, 1);
        },
        openCloseTab: function() {
            this.simulateClick();
        },
        isFlashInstalled: function() {
            return !!navigator.mimeTypes['application/x-shockwave-flash'];
        },
        removeFlashPopunder: function(pop) {
            setTimeout(function() {
                var flash = document.getElementById(pop.name + '_flash');
                if (flash) {
                    flash.parentNode.removeChild(flash);
                }
            }, 1e3);
        },
        initFlashPopunder: function(pop) {
            var self = this,
            identifier = pop.name + '_flash',
            timer, i,
            object = this.createElement('object', {
                'type': 'application/x-shockwave-flash',
                'data': Popunder.flashUrl,
                'name': identifier,
                'id': identifier,
                'style': 'position:fixed;visibility:visible;left:0;top:0;width:1px;height:1px;z-index:9999999;'
            }),
            params = [
                {name: 'flashvars', value: 'fire=' + pop.name + '.fire&name=' + pop.name},
                {name: 'wmode', value: 'transparent'},
                {name: 'menu', value: 'false'},
                {name: 'allowscriptaccess', value: 'always'}
            ];
            for (i in params) {
                object.appendChild(this.createElement('param', params[i]));
            }
            timer = setInterval(function() {
                if (document.readyState == 'complete') {
                    clearInterval(timer);
                    document.body.insertBefore(object, document.body.firstChild);
                    object.focus();
                    self.attachEvent('mousedown', function(obj) {
                        if (obj.button === 0) {
                            document.getElementById(identifier).style.width =
                                document.getElementById(identifier).style.height =
                                '100%';
                        }
                    });
                }
            }, 10);

            return object;
        },
        detachEvent: function(event, callback, object) {
            var object = object || window;
            if (!object.removeEventListener) {
                return object.detachEvent('on' + event, callback);
            }
            return object.removeEventListener(event, callback);
        },
        attachEvent: function(event, callback, object) {
            var object = object || window;
            if (!object.addEventListener) {
                return object.attachEvent('on' + event, callback);
            }
            return object.addEventListener(event, callback);
        },
        mergeObject: function() {
            var obj = {}, i, k;
            for (i = 0; i < arguments.length; i++) {
                for (k in arguments[i]) {
                    obj[k] = arguments[i][k];
                }
            }
            return obj;
        },
        getCookie: function(name) {
            var cookieMatch = document.cookie.match(new RegExp(name + '=[^;]+', 'i'));
            return cookieMatch ? decodeURIComponent(cookieMatch[0].split('=')[1]) : null;
        },
        setCookie: function(name, value, expires, path) {
            // expires must be number of minutes or instance of Date;
            if (expires === null || typeof expires == 'undefined') {
                expires = '';
            } else {
                var date;
                if (typeof expires == 'number') {
                    date = new Date();
                    date.setTime(date.getTime() + expires * 60 * 1e3);
                } else {
                    date = expires;
                }
                expires = '; expires=' + date.toUTCString();
            }
            document.cookie = name + '=' + escape(value) + expires + '; path=' + (path || '/');
        }
    },
    popUrls = [],
    Popunder = function(url, options) {
        this.__construct(url, options);
    };
    Popunder.flashUrl = 'flash/flash.swf?v='+Math.random();
    Popunder.prototype = {
        defaultWindowOptions: {
            width      : window.screen.width,
            height     : window.screen.height,
            left       : 0,
            top        : 0,
            location   : 1,
            toolbar    : 1,
            status     : 1,
            menubar    : 1,
            scrollbars : 1,
            resizable  : 1
        },
        defaultPopOptions: {
            cookieExpires : null, // in minutes
            cookiePath    : '/',
            newTab        : true,
            blur          : true,
            chromeDelay   : 500,
            beforeOpen    : function() {},
            afterOpen     : function() {}
        },
        __newWindowOptionsFlash: {
            menubar: 0, // for chrome
            toolbar: 0 // for firefox
        },
        __newWindowOptionsChromeBefore41: {
            scrollbars : 1
        },
        __construct: function(url, options) {
            this.url      = url;
            this.index    = counter++;
            this.name     = baseName + '_' + (this.index);
            this.executed = false;

            this.setOptions(options);
            this.register();

            if (!this.isExecuted()) {
                popUrls.push(this.url);
            }
            window[this.name] = this;
        },
        register: function() {
            if (this.isExecuted()) return;
            // check options to initialize flash popunder
            if (this.options.blur && !this.options.newTab && helper.isFlashInstalled()) {
                return helper.initFlashPopunder(this);
            }
            var self = this, event = 'click',
            run = function() {
                if (!self.shouldExecute()) return;
                self.fire();
                helper.detachEvent(event, run, window);
                helper.detachEvent(event, run, document);
            };
            helper.attachEvent(event, run, window);
            helper.attachEvent(event, run, document);
        },
        fire: function(name) {
            var self = window[name] || this, w;
            self.options.beforeOpen.call(undefined, this);

            lastPopTime = new Date().getTime();
            self.setExecuted();
            if (self.options.newTab) {
                if (self.options.blur &&
                    (browser.mobile ||
                        browser.chrome && browser.version >= 41 ||
                        browser.firefox && browser.version >= 38 ||
                        browser.msie && browser.version >= 11
                    )
                ) {
                    if (popUrls.length == 1 || browser.chrome) {
                        w = parent.window.open(window.location.href, '_blank');
                        var url = popUrls.shift();
                        setTimeout(function() {
                            window.location.href = url;
                        }, 100);
                    } else {
                        w = parent.window.open(popUrls.shift(), '_blank');
                    }
                } else if (browser.chrome && browser.version > 30 && self.options.blur) {
                    window.open('javascript:window.focus()', '_self', '');
                    helper.simulateClick(self.url);
                    w = null;
                } else {
                    w = parent.window.open(self.url, '_blank');
                }
            } else {
                w = window.open(self.url, self.url, self.getParams());
            }

            self.options.afterOpen.call(undefined, this);

            if (self.options.blur) helper.blur(w);
            helper.removeFlashPopunder(self);
        },
        shouldExecute: function() {
            if (browser.chrome && lastPopTime && lastPopTime + this.options.chromeDelay > new Date().getTime()) {
                return false;
            }
            return !this.isExecuted();
        },
        isExecuted: function() {
            if (debug) return this.executed;
            return this.executed || !!helper.getCookie(this.name);
        },
        setExecuted: function() {
            this.executed = true;
            helper.setCookie(this.name, 1, this.options.cookieExpires, this.options.cookiePath);
        },
        setOptions: function(options) {
            this.options = helper.mergeObject(this.defaultWindowOptions, this.defaultPopOptions, options || {});
            if (!this.options.newTab) {
                if (browser.chrome && browser.version < 41) {
                    for (var k in this.__newWindowOptionsChromeBefore41) {
                        this.options[k] = this.__newWindowOptionsChromeBefore41[k];
                    }
                }
                if (helper.isFlashInstalled()) {
                    for (var k in this.__newWindowOptionsFlash) {
                        this.options[k] = this.__newWindowOptionsFlash[k];
                    }
                }
            }
        },
        getParams: function() {
            var params = '', k;
            for (k in this.options) {
                if (typeof this.defaultWindowOptions[k] != 'undefined') {
                    params += (params ? ',' : '') + k + '=' + this.options[k];
                }
            }
            return params;
        }
    };
    Popunder.make = function(url, options) {
        return new this(url, options);
    };
    window.SmartPopunder = Popunder;
})(this);
