import React, { Component } from 'react'
import { View, Text, TouchableOpacity,Platform, TextInput,Alert,AsyncStorage, StyleSheet,ScrollView,Image,Slider,Button ,TouchableHighlight,PermissionsAndroid} from 'react-native'
import { AnimatedCircularProgress } from 'react-native-circular-progress'
import FusedLocation from 'react-native-fused-location';
import SQLite from 'react-native-sqlite-storage'
import BackgroundGeolocation from 'react-native-mauron85-background-geolocation';
import images from './images'
import RNSettings from 'react-native-settings'
import {styles} from './styles'

console.disableYellowBox = true


export default class Bar extends Component {


  static navigationOptions = ({ navigation }) => {
      return{
      headerTitle: "Home",
      headerTintColor: 'white',
      headerStyle:{backgroundColor:'#00897B'},
      headerLeft:null,
      headerRight: (
        <TouchableOpacity style={{marginRight:10}} onPress={() => navigation.navigate("Settings")}>
          <Image style={styles.icon} source={images.settings}/>
        </TouchableOpacity>
      ),
    }
  };


  state = {
    v:'1',
    val:'Start Tracking',
    stop:0.0,
    acc:0.0,
    turn:0.0,
    deacc:0.0,
    short_break:0.0,
    running:0.0,
    speeding:0.0,
    sharp_turn:0.0,
    harsh_acc:0.0

  }


bar_disp=(event,tx)=>{
    var total = 0
    var run = 0
    var total1 = 0
    var run1 = 0
    var percentage = 0

          tx.executeSql('SELECT * FROM Events', [], (tx, results) => {
            var len = results.rows.length;
            console.log("Length:",len)
            if(len>0){
                 tx.executeSql("SELECT SUM(curr_timestamp-last_timestamp) FROM Events WHERE event !='stop'" ,[], (tx,results) => {
                   total = results.rows.item(0)
                   for (var key in total) {
                      total1 = total[key];
                    }
                 });
                 tx.executeSql("SELECT SUM(curr_timestamp-last_timestamp) FROM Events WHERE event ='"+event+"'" ,[], (tx, results) => {
                   run = results.rows.item(0)
                   for (var key in run) {
                     run1 = run[key];
                 }
                 if(run1){
                   console.log(event,(run1/total1)*100)
                    percentage = (run1/total1)*100
                    this.set_bar(event,percentage);
                  }

                 });
              }
         });
     }

set_bar=(event,percentage)=>
  {
     var obj = {}
     obj[event] =percentage
     this.setState(obj, function() {
           console.log(this.state.running)
   });

   if(event=='sharp turn')
     {
       this.setState({sharp_turn:percentage}, function() {
             console.log("Sharp",this.state.sharp_turn)
     });
     }
  }

create=()=>{
    //Create required tables
      var db = SQLite.openDatabase({name: 'my.db', location: 'default'});
      db.transaction((tx) => {
      tx.executeSql('CREATE TABLE IF NOT EXISTS Location('+
                        'id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,'+
                        'timestamp REAL,'+
                        'lat varchar(255),'+
                        'long varchar(255),'+
                        'bearing REAL,'+
                        'speed REAL,'+
                        'accuracy REAL)');

      tx.executeSql('CREATE TABLE IF NOT EXISTS Events('+
                        'id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,'+
                        'sync INTGER,'+

                        'event varchar(255),'+

                        'last_timestamp REAL,'+
                        'curr_timestamp REAL,'+

                        'last_lat varchar(255),'+
                        'curr_lat varchar(255),'+

                        'last_long varchar(255),'+
                        'curr_long varchar(255),'+


                        'last_bearing REAL,'+
                        'curr_bearing REAL,'+

                        'last_speed REAL,'+
                        'curr_speed REAL)',
                    );

        console.log("Database Created");
      });
  }


add(timestamp,lat,long,bearing,speed,accu,k,bearing_diff,b1,b2){
      var speed = speed*3.6 //convert speed from m/s to km/h
    //console.log(speed,"km/h")
    //console.log("add Bearing_diff:",bearing_diff)
      var event = "null"
      //console.log("Turn:",k.turn)

      var db = SQLite.openDatabase({name: 'my.db', location: 'default'});
      db.transaction((tx) => {

      var accu1 = accu.toFixed(2)
      var lat1 = JSON.stringify(lat)
      var long1 = JSON.stringify(long)
      //var timestamp = parseInt(timestamp)
      //console.log("timestamp1:",timestamp1)

      tx.executeSql("Insert into Location (timestamp,lat,long,bearing,speed,accuracy) values("+timestamp+",'"+lat1+"','"+long1+"',"+bearing+","+speed+","+accu1+");")
      console.log("Inserted into Location");

      tx.executeSql('SELECT * FROM Events', [], (tx, results) => {
        var len = results.rows.length;
        //console.log("lenght:",len)
        //initial entry in the database
        if(len<=0){
          tx.executeSql("Insert into Events "+event_query+" values(0,'stop',"+timestamp+","+timestamp+",'"+lat1+"','"+lat1+"','"+long1+"','"+long1+"',"+bearing+","+bearing+","+speed+","+speed+");")
          //console.log("Inserted into events")
        }

        else{
            //get the last record from the database
            tx.executeSql('SELECT * from Events ORDER BY id DESC LIMIT 1', [], (tx, results) => {
              var event_row = results.rows.item(0) //last record from event database
              console.log("Events:",event_row)

              //for turn
              if(bearing_diff >= 45){

                console.log("Diff bearing:",bearing_diff)
                //this is exception where bearing change from less than 360 to more more than zero
                if(bearing_diff>180){
                    bearing_diff = Math.abs(360 - bearing_diff)
                }

                event = "turn"
                if(bearing_diff>= 45){
                    if(speed>k.turn){
                        event = "sharp turn"
                        this.turn(tx,b1,b2,event,lat1,long1,speed,bearing,timestamp,event_row)
                    }
                    else{
                        event = "turn"
                        this.turn(tx,b1,b2,event,lat1,long1,speed,bearing,timestamp,event_row)
                    }
                 }
               }
               else{
                  event = this.getEvent(speed,k,event_row)
                  console.log("New Event",event)
                  this.event(tx,event,lat1,long1,speed,bearing,timestamp,event_row)
              }
            });
          }
        });

    });
  }

getEvent(speed,k,event_row){
  var event = "running"
  if(speed <= 0 ){
    event = "stop"
  }

  else if(speed - event_row.curr_speed > 2*k.acceleration){
       event = "harsh_acc"
   }


  else if(speed - event_row.curr_speed > k.acceleration){
      event = "acc"
  }

 else if(event_row.curr_speed - speed > k.short_break ){
      event = "short_break"
  }

  else if(event_row.curr_speed - speed > k.deacceleration ){
       event = "deacc"
   }

  else if(speed > k.speeding ){
       event = "speeding"
   }
  else{
       event = "running"
   }
   console.log("get",event)
  return event
}
turn(tx,b1,b2,event,lat1,long1,speed,bearing,timestamp,event_row){
    //console.log("Event prev turn",event_row.event)
    //console.log(event)

    if(timestamp - event_row.last_timestamp > 55000){
    this.insert_new(tx,event,lat1,long1,speed,bearing)
    }

    else if(event_row.event!=event){
        tx.executeSql('SELECT * from Events' + " where last_timestamp >="+b1.timestamp+" and "+
        "curr_timestamp<=" + b2.timestamp , [], (tx, results) => {

        if(results.rows.length<=0){
            this.insert_continue(tx,event,lat1,long1,speed,bearing,timestamp,event_row)
            console.log("Inserted turn")
        }
        else{
            tx.executeSql("UPDATE Events set "+
            "event='"+event+"'"+
            " where last_timestamp >="+b1.timestamp+" and "+
            "curr_timestamp<=" + b2.timestamp);
            console.log("Update into turn *****")
        }
        });
    }

    else{
    this.update(lat1,long1,speed,bearing,timestamp,event_row)
    }
  }

event(tx,event,lat1,long1,speed,bearing,timestamp,event_row){
    //if time stamp difference between last event and current event is greater than 60*3s than initiate new event wiht current timestamp
    if(timestamp - event_row.last_timestamp > 60000*3){
      this.insert_new(tx,event,timestamp,lat1,long1,speed,bearing)
      //console.log("1evnet")
     }
     //Continue adding events with continious timestamp
    else if(event_row.event!=event || timestamp - event_row.last_timestamp > 15000){
      this.insert_continue(tx,event,lat1,long1,speed,bearing,timestamp,event_row)
      //console.log("2evnet")
    }
    //extend event
    else{
     this.update(lat1,long1,speed,bearing,timestamp,event_row)
     //console.log("3evnet")
    }
}

//insert event in continious timestamp(prev timestamp == next.current_timestamp)
insert_continue(tx,event,lat1,long1,speed,bearing,timestamp,event_row){
  tx.executeSql("Insert into Events "+event_query+" values(0,'"+event+"',"+event_row.curr_timestamp+","+timestamp+",'"+event_row.curr_lat+"','"+lat1+"','"+event_row.curr_long+"','"+long1+"',"+event_row.curr_bearing+","+bearing+","+event_row.curr_speed+","+speed+");")

}
//insert event in non continious timestamp(next.current_timestamp == next.previous_timestamp)
insert_new(tx,event,timestamp,lat1,long1,speed,bearing){
  tx.executeSql("Insert into Events "+event_query+" values(0,'"+event+"',"+timestamp+","+timestamp+",'"+lat1+"','"+lat1+"','"+long1+"','"+long1+"',"+bearing+","+bearing+","+speed+","+speed+");")
}
//extend the event
update(tx,lat1,long1,speed,bearing,timestamp,event_row){
  tx.executeSql("UPDATE Events set "+
              "curr_lat ='"+lat1+ "',"+
              "curr_long ='"+long1+ "',"+
              "curr_speed ="+speed+ ","+
              "curr_bearing ="+bearing+ ","+
              "curr_timestamp ="+timestamp +
              " where id ="+event_row.id);
}

 //called when component in launched
 async componentWillMount(){

   var db = SQLite.openDatabase({name: 'my.db', location: 'default'});
   db.transaction((tx) => {
   this.bar_disp('harsh_acc',tx)
   this.bar_disp('running',tx)
   this.bar_disp('stop',tx)
   this.bar_disp('turn',tx)
   this.bar_disp('deacc',tx)
   this.bar_disp('short break',tx)
   this.bar_disp('speeding',tx)
   this.bar_disp('sharp turn',tx)
   this.bar_disp('acc',tx)
  });


  //this.props.navigation.setParams({ navigate: this.goToSettings });
 }

//button start-stop text logic
button_m=() =>{
     var v = this.state.v
     if(v=='1')
     {
       this.setState({val:'Stop Tracking'})
       this.setState({v:'0'})
       this.start_tracking()
     }
     else
     {
       this.setState({val:'Start Tracking'})
       this.setState({v:'1'})
       this.stop_tracking()
      v=1
     }

  }


start_tracking_ios=()=>{
  var k = this.state.settings
    this.create()
    //var k = this.state.settings


    BackgroundGeolocation.configure({
      desiredAccuracy: BackgroundGeolocation.HIGH_ACCURACY,
      stationaryRadius: 0,
      distanceFilter: 0,
      notificationTitle: 'Background tracking',
      notificationText: 'enabled',
      debug: false,
      startOnBoot: false,
      stopOnTerminate: false,
      locationProvider: BackgroundGeolocation.ACTIVITY_PROVIDER,
      interval: 1000,
      fastestInterval: 500,
      activitiesInterval: 1000,
      stopOnStillActivity: false,

    });

    var flag = 0
    var flag_inside = 0
    var b1 = ""
    var b2 = ""
    var location_prev = 'none'

    BackgroundGeolocation.on('location', (location) => {
      if(location_prev === 'none'){
        location_prev=location
      }

      console.log(location)

      var bearing_diff = Math.abs(location.bearing - location_prev.bearing)
      console.log("prev:",location_prev,location)
      var timestamp1 = location.time
      var bearing = location.bearing
      var lat = JSON.stringify(location.latitude)
      var long = JSON.stringify(location.longitude)

      console.log("Flag",flag)

      console.log("bearing_diff1:",bearing_diff)
      console.log("b1",b1)

      if(bearing_diff>7 || flag == 1){
      console.log("flag:",flag)
      if(flag==0){
            b1 = {
            timestamp:parseInt(location_prev.time),
            bearing: location_prev.bearing,
            lat: JSON.stringify(location_prev.latitude),
            long:JSON.stringify(location_prev.longitude),
            speed:location_prev.speed

          }
           b2 = {
           timestamp:parseInt(location.time),
           bearing: location.bearing,
           lat: JSON.stringify(location.latitude),
           long:JSON.stringify(location.longitude),
           speed:location.speed

         }

          flag = 1
      }

      else{
        if( b2.timestamp - b1.timestamp >= 12000){
          b2 = {timestamp:timestamp1,bearing:bearing,lat: lat,long:long}
          bearing_diff = Math.abs(b2.bearing - b1.bearing)
          flag = 0
          //console.log("This is flag")
        }

        else if( b2.timestamp - b1.timestamp >= 7000){
          b2 = {timestamp:timestamp1,bearing:bearing,lat: lat,long:long}
          bearing_diff = Math.abs(b2.bearing - b1.bearing)

          if(bearing_diff > t_60 && bearing_diff<180){
            flag=0
          }
          else if( bearing_diff>180 && Math.abs(360-bearing_diff)>t_60){
            flag = 0
          }
        }

        else{
          b2 = {timestamp:timestamp1,bearing:bearing,lat: lat,long:long}

        }
      }

       bearing_diff = Math.abs(b2.bearing - b1.bearing)
      }

      location_prev = location


      this.add(parseInt(location.time),location.latitude,location.longitude,location.bearing,location.speed,location.accuracy,k,bearing_diff,b1,b2)


    });

    BackgroundGeolocation.on('start', () => {
      console.log('[INFO] BackgroundGeolocation service has been started');
    });

    BackgroundGeolocation.on('stop', () => {
      console.log('[INFO] BackgroundGeolocation service has been stopped');
    });

    BackgroundGeolocation.on('authorization', (status) => {
      console.log('[INFO] BackgroundGeolocation authorization status: ' + status);
      if (status !== BackgroundGeolocation.AUTHORIZED) {
        // we need to set delay or otherwise alert may not be shown
        setTimeout(() =>
          Alert.alert('App requires location tracking permission', 'Would you like to open app settings?', [
            { text: 'Yes', onPress: () => BackgroundGeolocation.showAppSettings() },
            { text: 'No', onPress: () => console.log('No Pressed'), style: 'cancel' }
          ]), 1000);
      }
    });

    BackgroundGeolocation.on('background', () => {
      console.log('[INFO] App is in background');
    });

    BackgroundGeolocation.on('foreground', () => {
      console.log('[INFO] App is in foreground');
    });


   BackgroundGeolocation.start();

 }

async start_tracking(){

    var value =   await AsyncStorage.getItem('settings');
    value = JSON.parse(value)
    console.log("New Settings:",value)
    this.setState({settings:value})

    var os = Platform.OS
    if(os==='ios'){
        this.start_tracking_ios()
    }
    else{
        this.start_tracking_android()
    }
  }
//Called when location is disabled on device.
location_alert=()=>{
    Alert.alert(
    'Alert',
    'Navyo wants to know your location',
    [

      {text: 'Cancel', onPress: () => {
        this.setState({v:'1',val:'Start tracking'})
        //this.stop_tracking()
      }},
      {text: 'Ok', onPress: () => this.go_to_location()},
    ],
    { cancelable: false }
  )
}

//Navigates to device location settings
go_to_location=()=>{
  RNSettings.openSetting(RNSettings.ACTION_LOCATION_SOURCE_SETTINGS)
  this.setState({v:'1',val:'Start tracking'})
  this.stop_tracking()
  //this.start_tracking()
}


async start_tracking_android(){

   const granted = await PermissionsAndroid.request(
                      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION, {
                          title: 'App needs to access your location',
                          message: 'App needs access to your location ' +
                          'so we can let our app be even more awesome.'
                          }
                      );
    //checks location is on or off on device
   RNSettings.getSetting(RNSettings.LOCATION_SETTING).then(result => {

    if (result == RNSettings.ENABLED) {
          console.log('location is enabled')
      } else {
           this.location_alert()
      }
    })


    //get deriving setting
    var k = this.state.settings

    console.log("Granted",granted)

    if (granted) {
      this.create()

       FusedLocation.setLocationPriority(FusedLocation.Constants.HIGH_ACCURACY);
       var location_prev =  FusedLocation.getFusedLocation();

       FusedLocation.setLocationPriority(FusedLocation.Constants.HIGH_ACCURACY);
       FusedLocation.setLocationInterval(2000);
       FusedLocation.setFastestLocationInterval(1000);
       FusedLocation.setSmallestDisplacement(0);

       FusedLocation.startLocationUpdates();
       var flag = 0
       var b1 = ""
       var b2 = ""

       this.subscription = FusedLocation.on('fusedLocation', location => {
         console.log(location)

         var bearing_diff = Math.abs(location.bearing - location_prev.bearing)
         //console.log("prev:",location_prev,location)
         var timestamp1 = parseInt(location.timestamp)
         var bearing = location.bearing
         var lat = JSON.stringify(location.latitude)
         var long = JSON.stringify(location.longitude)

         if(bearing_diff>10 || flag == 1){
            if(flag==0){
                  b1 = {
                  timestamp:parseInt(location_prev.timestamp),
                  bearing: location_prev.bearing,
                  lat: JSON.stringify(location_prev.latitude),
                  long:JSON.stringify(location_prev.longitude),
                  speed:location_prev.speed

                }
                  b2 = {
                  timestamp:parseInt(location.timestamp),
                  bearing: location.bearing,
                  lat: JSON.stringify(location.latitude),
                  long:JSON.stringify(location.longitude),
                  speed:location.speed

                }

                flag = 1
            }

            else{
              if( b2.timestamp - b1.timestamp >= 10000){
                b2 = {timestamp:timestamp1,bearing:bearing,lat: lat,long:long}
                bearing_diff = Math.abs(b2.bearing - b1.bearing)
                flag = 0
                console.log("I am >10000")
                console.log(">10000:",bearing_diff)

                //console.log("This is flag")
              }

              else if( b2.timestamp - b1.timestamp >= 5000){
                console.log("I am >5000")
                b2 = {timestamp:timestamp1,bearing:bearing,lat: lat,long:long}
                bearing_diff = Math.abs(b2.bearing - b1.bearing)
                console.log(">5000:",bearing_diff)
                if(bearing_diff > t_60 && bearing_diff<180){
                  console.log(">40")
                  flag=0
                }
                else if( bearing_diff>180 && Math.abs(360-bearing_diff)>t_60){
                  console.log(">40 180")
                  flag = 0
                }
              }

              else{
                console.log("I am b2 update")
                b2 = {timestamp:timestamp1,bearing:bearing,lat: lat,long:long}

              }
            }

              bearing_diff = Math.abs(b2.bearing - b1.bearing)
         }

         location_prev = location
         console.log("B1",b1)
         console.log("B2",b2)
         console.log("Current Bearing_diff",bearing_diff)

        if(location.accuracy<=80){
         this.add(parseInt(location.timestamp),location.latitude,location.longitude,location.bearing,location.speed,location.accuracy,k,bearing_diff,b1,b2)
       }
       });

       this.errSubscription = FusedLocation.on('fusedLocationError', error => {
            console.log(error)
        })
      }
   }

   stop_tracking(){
     if(Platform.OS === 'ios'){
       this.stop_tracking_ios()
     }
     else{
       this.stop_tracking_android()
     }
   }

   stop_tracking_ios(){
     BackgroundGeolocation.events.forEach(event => BackgroundGeolocation.removeAllListeners(event));
   }

   stop_tracking_android=()=>{
     FusedLocation.off(this.subscription);
     FusedLocation.off(this.errSubscription);
     FusedLocation.stopLocationUpdates();
   }

    render(){
      const { navigate } = this.props.navigation;

        return (
                <View style = {styles.barContainer}>
                  <View style = {styles.mainBarContainer}>
                      <View style={{width:'68%',alignItems:'flex-end'}}>
                          <AnimatedCircularProgress
                            size={120}
                            width={13}
                            tintColor="green"
                            rotation={0}
                            fill = {parseFloat((500-(this.state.short_break*1.6+this.state.sharp_turn+this.state.acc+this.state.speeding*1.6+this.state.harsh_acc*2))/5)}
                            backgroundColor="#ef5350">
                            {
                              (fill) => (
                                <Text style={{color:'black'}}>
                                {fill.toFixed(2)}%
                                </Text>
                              )
                            }
                          </AnimatedCircularProgress>
                      </View>

                      <View style={{width:'42%',alignItems:'flex-start',padding:20}} >
                          <Text>Average</Text>
                          <Text>Overall</Text>
                        <Text>Score</Text>

                      </View>
                </View>

                <View style = {styles.linearBarContainer}>
                    <View style={styles.progressBar}>
                        <AnimatedCircularProgress
                          size={80}
                          width={8}
                          tintColor="#ef5350"
                          rotation={0}
                          fill = {parseFloat(this.state.short_break+this.state.deacc)}
                          backgroundColor="green">
                        {
                          (fill) => (
                            <Text style={{color:'black'}}>
                              {fill.toFixed(2)}%
                            </Text>
                          )
                        }
                        </AnimatedCircularProgress>
                        <Text>Breaking</Text>
                    </View>
                    <View style={styles.progressBar}>
                        <AnimatedCircularProgress
                          size={80}
                          width={8}
                          tintColor="#ef5350"
                          rotation={0}
                          fill = {parseFloat(this.state.acc + this.state.harsh_acc)}
                          backgroundColor="green">
                        {
                          (fill) => (
                            <Text style={{color:'black'}}>
                            {fill.toFixed(2)}%
                            </Text>
                          )
                        }
                        </AnimatedCircularProgress>
                        <Text>Acceleration</Text>
                    </View>
              </View>
              <View style = {styles.linearBarContainer}>
                <View style={styles.progressBar}>
                <AnimatedCircularProgress
                  size={80}
                  width={8}
                  tintColor="#ef5350"
                  rotation={0}
                  fill = {parseFloat(this.state.speeding)}
                  backgroundColor="green">
                {
                  (fill) => (
                    <Text style={{color:'black'}}>
                    {fill.toFixed(2)}%
                    </Text>
                  )
                }
                </AnimatedCircularProgress>
                        <Text>Speeding</Text>
                        </View>
                        <View style={styles.progressBar}>
                        <AnimatedCircularProgress
                          size={80}
                          width={8}
                          tintColor="#ef5350"
                          rotation={0}
                          fill = {parseFloat(this.state.sharp_turn + this.state.turn)}
                          backgroundColor="green">
                        {
                          (fill) => (
                            <Text style={{color:'black'}}>
                              {fill.toFixed(2)}%
                            </Text>
                          )
                        }
                </AnimatedCircularProgress>
                        <Text>Cornering</Text>
                        </View>
              </View>

              <View>
                 <TouchableOpacity
                  style = {styles.Button} onPress={this.button_m}>
                  <Text style = {styles.ButtonText}>{this.state.val}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => navigate("DrivingEvents")}
                    style = {styles.Button}>
                  <Text style = {styles.ButtonText}>View Events</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => navigate("Location")}
                    style={styles.Button}>
                    <Text style = {styles.ButtonText}>Driving Map</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => navigate("Api")}
                    style={styles.Button}>
                    <Text style = {styles.ButtonText}>Upload</Text>
                  </TouchableOpacity>
             </View>
            </View>
          )
    }
  }



const event_query = '(sync,event,last_timestamp,curr_timestamp,last_lat,curr_lat,last_long,curr_long,last_bearing,curr_bearing,last_speed,curr_speed) '
const t_60 = 60
