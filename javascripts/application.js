$("body").bind("pageAnimationEnd", function (e, info) {
    $('body').height($('div.current').height());
});

function Guff() {
}

Guff.prototype = {
    loc: null,
    watchId: null,
    maxchars: 141,
    db: null,
    url: 'guff.herokuapp.com',
    clickEvent: 'click',
    requiredAccuracy: 100,
    accuracySteps: [],
    //url: '192.168.0.3:4567',

    init: function() {
        //bind interactions - ******this should probably be moved till after we are happy with accuracy******

        // Determine if iPhone, Android or Desktop OS and setup the right click-event ("tap" vs "click").
        var userAgent = navigator.userAgent.toLowerCase();
        var isiPhone = (userAgent.indexOf('iphone') != -1
                        || userAgent.indexOf('ipod') != -1
                        || userAgent.indexOf('ipad') != -1) ? true : false;

        
        //this.clickEvent = isiPhone ? 'tap' : 'click';
        //Set click event to tap as click is not used by any of our target devices
        this.clickEvent = 'tap';

        var o = this;

        //Setup listener for when resume
        document.addEventListener("resume", function() {
            console.log("******* RESUMED ******")
        
            //Get messages then get location?
            o.getMessages(o.loc.coords.latitude, o.loc.coords.longitude, "#messages"); 
            //
            o.getLocation();
        }, false); 
        
        this.disableInteraction();
        this.postMessage();
        this.refreshLocation();
        this.countDown();
        //kick things off
        this.getLocation();


    },

    disableInteraction: function() {
        console.log('disabling all interactions until accurate location obtained');
        $('.button').hide();
    },

    enableInteraction: function() {
        console.log('enabling all interactions after accurate location obtained');
        $('.button').show();
    },

    enableSubmit: function() {
        console.log("message submit enabled");
        $("#submitGuff").on("click", function(e){
            console.log("message form trigger submit");
            $(this).addClass('active');
            $("#send-guff").submit();
        })
    },
    
    getLocation: function() {
        console.log('getting location, current WatchID: '+this.watchId);
        var o = this;
        this.watchId = navigator.geolocation.watchPosition(function(loc) {  o.checkAccuracy(loc); }, function(error) { o.errorHandler('geo', 'Unable to get location', error); }, {
            enableHighAccuracy: true,
            maximumAge: 1000
        });
    },
    
    refreshLocation: function() {

        var o = this;
        $("#locationRefresh").on(o.clickEvent, function(e) {
            console.log('refreshing location');
            o.getLocation();
        });
    },
    
    checkAccuracy: function(loc) {
        console.log('checking accuracy');
        console.log('accuracy at: ' + loc.coords.accuracy);
        
        this.accuracySteps.push(loc.coords.accuracy);
        var accuracyMeter = (this.requiredAccuracy / this.accuracySteps[0])*100;
        if(accuracyMeter<=100) {
            $("#accuracy-indicator span").css({width: accuracyMeter+'%'});
        }

        if (accuracyMeter<=30) {
            $("#accuracy-indicator span").css({backgroundColor: 'red'});
        } else if (accuracyMeter > 30 && accuracyMeter <= 60) {
            $("#accuracy-indicator span").css({backgroundColor: 'orange'});
        } else if (accuracyMeter > 60 && accuracyMeter < 100) {
            $("#accuracy-indicator span").css({backgroundColor: 'yellow'});
        } else {
            $("#accuracy-indicator span").css({backgroundColor: 'green'});
        }
        
        
        if(loc.coords.accuracy < this.requiredAccuracy) {
            console.log('accurate location obtained');
            console.log('accuracy at: '+loc.coords.accuracy);
            navigator.geolocation.clearWatch(this.watchId); 
            this.enableInteraction();
            this.loc = loc;
            
            //set hidden fields for message form
            $("#accuracy").attr('value', this.loc.coords.accuracy);
            $("#latitude").attr('value', this.loc.coords.latitude);
            $("#longitude").attr('value', this.loc.coords.longitude);
            
            //bind interactions etc
            this.setMap();
            this.getMessages(this.loc.coords.latitude, this.loc.coords.longitude, "#messages");
            this.enableSubmit();
        }
    },
    
    setMap: function() {
        console.log('setting map: ' + this.loc.coords.latitude + this.loc.coords.longitude);
        $("#loading").show();
        var img = new Image();
        img.src = "http://maps.google.com/maps/api/staticmap?center="+this.loc.coords.latitude+","+this.loc.coords.longitude+"&zoom=15&size=200x200&maptype=roadmap&markers=color:blue|"+this.loc.coords.latitude+","+this.loc.coords.longitude+"&sensor=true";
        console.log(img.src);
        img.onload = function() {
            console.log('loaded map image from google');
            $("#loading").hide();
            $("#map span").html(img);
            $(img).css({width: '100%', height: 'auto'});
        }
    },
    
    getMessages: function(lat, lng, list) {
        console.log('getting messages');
        var o = this;
        var message_data = "http://"+o.url+"/messages/"+lat+"/"+lng;
        var list = list;
        console.log(message_data);
        $.ajax({
          type: 'get',
          url: message_data,
          dataType: 'json',
          timeout: 8000,
          context: $('body'),
          success: function(data){ o.parseMessages(data, list); },
          error: function(xhr, type){ o.errorHandler('ajax', xhr, type); }
        });
    },
    
    parseMessages: function(data, list) {
        console.log('parsing messages messages');
        var o = this;
        var append = '';
        $(data).each(function(){
            append += "<li><p>"+this.message+"</p><span>"+o.remaningMessageTime(7190)+"</span></li>";
        });
        $(list).html(append);
    },
        
    postMessage: function() {
        
        var o = this;
        $('#send-guff').on('submit', function(e){
            
            //disable button till successful submission or error
            $("#submitGuff").off('click');
            
            if ($('#message').attr('value').length>0) {
                o.getTokenID(function(tokenID) {
                    $.ajax({
                         url: $('#send-guff').attr('action'),
                         type: 'post',
                         data: $('#send-guff').serialize()+"&tokenID="+tokenID,
                         dataType: 'json',
                         timeout: 8000,
                         success: function(data) { 
                            console.log('message posted successfully');
                            o.notificationHandler('success','Message posted');
                            //Trigger doesn't work on iphone or android

                            $("#back").trigger(o.clickEvent);
                            o.resetMessageField();
                            o.enableSubmit();
                            o.getMessages(o.loc.coords.latitude, o.loc.coords.longitude, "#messages"); 
                         },
                         error: function(xhr, type){ o.errorHandler('ajax', xhr, type); }
                    });
                });
            } else {
                //o.errorHandler('user', 'You need to write something', '');
                console.log('You need to write something')
            }
            return false;
        });
    },
    
    resetMessageField: function() {
        $("#message").val('');
        $("#counter").html(this.maxchars);
    },
    
    newMessage: function() {
        //needs to be changed for new push updates
        var o = this;
        this.channel.bind("new_guff", function(data) {
            $("#messages").prepend("<li><p>"+data+"</p><span>"+o.remaningMessageTime(7200)+"</span></li>");
         });  
    },
    
    countDown: function() {
        var o = this;
        $('#message').bind('keydown', function(e) {
            text = $(this).val();
            noc = text.length;
            chars_left = o.maxchars - noc;
            $("#counter").html(chars_left);
            if(noc > o.maxchars) {
                $("#counter").css('color', 'red');
            } else {
                $("#counter").css('color', '#4D4D4D');
            }
        });
    },
    
    remaningMessageTime: function(seconds) {
        minutes = Math.round(seconds / 60);
        hours = minutes / 60;
        if(hours > 1) {
            if (minutes > 115) {
                var mOld = 121-minutes;
                var mS = mOld > 1 ? 's':'';
                time_message = mOld+"m "+mS+"ago";
            } else {
                time_message = 'under 2 hours left ';
            }
        } else if (hours <= 1 && minutes > 30) {
            time_message = 'under 1 hour left';
        } else if (minutes <= 30 && minutes > 2) {
            time_message = 'under 30 minutes left';
        } else {
            time_message = 'nearly outta here';
        }
        return time_message;
    },
    
    notificationHandler: function(type, message) {
      switch(type)
      {
          case 'success':
                console.log(message);
            break;
      }  
    },
    
    errorHandler: function(type, message, error) {
        $("#error").show();
        switch(type)
        {
        case 'geo':
                if (error.code>0) {
                    if (error.code===1) {
                        $("#error").append("Denied");
                    } else if (error.code===2) {
                        $("#error").append("Position Unavailable");
                    } else if (error.code===3) {
                        $("#error").append("Timeout");
                    }
                }
            break;
        case 'ajax':
                $("#error").append(message);
            break;
        case 'user':
                $("#error").append(message);
            break;
        case 'db':
                $("#error").append(error.message);
                console.log(error);
            break;
        }
        
    },

    //Set up Token retrieval plugin
    getTokenID: function(callback) {
        if(typeof cordova.exec == 'function') { 
            cordova.exec(callback, this.getTokenFail, "PushNotification", "getToken", []);
        } else {
            //Fake the callback
            callback('12345')
        }
    },
            
    getTokenFail: function(err) {
        alert("Failed to get Token")
    }




};

$(function(){
    var guff = new Guff();
    guff.init();
});

var jQT = new $.jQTouch({
    icon: 'jqtouch.png',
    addGlossToIcon: false,
    startupScreen: '/images/apple-touch-icon.png',
    statusBar: 'black',
    fixedViewport: true,
    formSelector: '.form'
});
