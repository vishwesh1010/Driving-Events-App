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
    
    trackingStatus:'Start Tracking',
    stop:0.0,
    acc:0.0,
    turn:0.0,
    deacc:0.0,
    short_break:0.0,
    running:0.0,
    speeding:0.0,
    sharp_turn:0.0,
    harsh_acc:0.0,
    timestampSum:0

  }


  progressbar_display=(event,tx)=>{
  
    var percentage = 0
    tx.executeSql("SELECT SUM(curr_timestamp-last_timestamp) FROM Events WHERE event ='"+event+"'" ,[], (tx, results) => {
      eventTimeSum= results.rows.item(0)['SUM(curr_timestamp-last_timestamp)']
      if(eventTimeSum){
        console.log(event,(eventTimeSum/this.state.timestampSum)*100)
        percentage = (eventTimeSum/this.state.timestampSum)*100

        var obj = {}
        obj[event] =percentage
        this.setState(obj);
      }

    });
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

add = (timestamp, lat, long, bearing, speed, accu, settings, bearing_diff, start_bearing_obj, stop_bearing_obj)=>{
      var speed = speed*3.6 //convert speed from m/s to km/h
      var event = "null"
      console.log(event)
      //console.log("Turn:",k.turn)

      var db = SQLite.openDatabase({name: 'my.db', location: 'default'});
      db.transaction((tx) => {

      var accu1 = accu.toFixed(2)
      var lat1 = JSON.stringify(lat)
      var long1 = JSON.stringify(long)

      //insert all the required attribute in Location database
      tx.executeSql("Insert into Location (timestamp,lat,long,bearing,speed,accuracy) values("+timestamp+",'"+lat1+"','"+long1+"',"+bearing+","+speed+","+accu1+");")
      console.log("Inserted into Location");
      //get the last record from the database
      //Appdb.getLastRow(callback,tx)
      tx.executeSql('SELECT * from Events ORDER BY id DESC LIMIT 1', [], (tx, results) => {
        var event_row = results.rows.item(0) //last record from event database
        //Determines driving events                
        this.logicLoop(tx, event_row, start_bearing_obj, stop_bearing_obj, event, lat1, long1, speed, bearing, timestamp, bearing_diff, settings)
     
        });
    });
  }
//Determines driving event                
logicLoop=(tx,event_row,start_bearing_obj,stop_bearing_obj,event,lat1,long1,speed,bearing,timestamp,bearing_diff,settings)=>{

    //when there are no recordes in Events table
    if(!event_row){
        tx.executeSql("Insert into Events "+event_query+" values(0,'stop',"+timestamp+","+timestamp+",'"+lat1+"','"+lat1+"','"+long1+"','"+long1+"',"+bearing+","+bearing+","+speed+","+speed+");")
        return
    }

    //for turn
    //here bearing_diff is abs difference between bearing at start of turn till it ends.
    //it is not the bearing diff between two consequtive GPS data 
    if(bearing_diff >= 45){

        event = "turn"
        //significant difference in bearing
        if(bearing_diff>= 45){
            //sharp turn settings
            if(speed>settings.turn){
                event = "sharp_turn"
                this.turn(tx,start_bearing_obj,stop_bearing_obj,event,lat1,long1,speed,bearing,timestamp,event_row)
            }
            else{
                event = "turn"
                this.turn(tx,start_bearing_obj,stop_bearing_obj,event,lat1,long1,speed,bearing,timestamp,event_row)
            }
        }
    }
    //for rest of the cases
    else{ 
          //return a event. Which includes one of the following
          // {acc,deacc,short_break,harsh_Acc}
          event = this.getEvent(speed,settings,event_row)
          console.log("New Event",event)
          this.insertEvent(tx,event,lat1,long1,speed,bearing,timestamp,event_row)
    }
}

//insert event into database
insertEvent(tx,event,lat1,long1,speed,bearing,timestamp,event_row){
  //whene there is significant diffrenece beetween last and current timestamp
  //if time stamp difference between last event and current event is greater than 60*3s than initiate new event wiht current timestamp
  
  if(timestamp - event_row.last_timestamp > 60000*3){
    this.insert_new(tx,event,timestamp,lat1,long1,speed,bearing)
    console.log("1evnet")
   }
   //Continue adding events with continious timestamp
  else if(event_row.event!=event || timestamp - event_row.last_timestamp > 15000){
    this.insert_continue(tx,event,lat1,long1,speed,bearing,timestamp,event_row)
    console.log("2evnet")
  }
  //extend event
  else{
   this.update(tx,lat1,long1,speed,bearing,timestamp,event_row)
   console.log("3evnet")
  }
}



//returns absolute difference between th\wo angles
//also includes one exception where angle1 is around 340 and angle2 in around 10
getAbsoluteAngle(angle1,angle2){
  var angle_diff = Math.abs(angle1 - angle2)
  //Max angle diff possible is 180 if >180 then it an exception. (200 for safty)
  if(angle_diff > 200){
      return 360 - angle_diff
  }
  console.log("abs diff:",angle_diff)
  return angle_diff

}
//return a event. Which includes one of the following
// {acc,deacc,short_break,harsh_Acc}
getEvent(speed,settings,event_row){
  var event = "running"
  if(speed <= 0 ){
    event = "stop"
  }

  else if(speed - event_row.curr_speed > 2*settings.acceleration){
       event = "harsh_acc"                 
   }


  else if(speed - event_row.curr_speed > settings.acceleration){
      event = "acc"      
  }

 else if(event_row.curr_speed - speed > settings.short_break ){
      event = "short_break"  
  }

  else if(event_row.curr_speed - speed > settings.deacceleration ){
       event = "deacc"    
   }

  else if(speed > settings.speeding ){
       event = "speeding"
   }
  else{
       event = "running"
   }
   console.log("get",event)
  return event
}

turn(tx,start_bearing_obj,stop_bearing_obj,event,lat1,long1,speed,bearing,timestamp,event_row){
    //significant time difference between last and current timestamp(55sec here)
    if(timestamp - event_row.last_timestamp > 55*1000){
    this.insert_new(tx,event,lat1,long1,speed,bearing)
    }

    //when last event is equal to current event
    else if(event_row.event!=event){

        tx.executeSql('SELECT * from Events' + " where last_timestamp >="+start_bearing_obj.timestamp+" and "+
        "curr_timestamp<=" + stop_bearing_obj.timestamp , [], (tx, results) => {
        //if there is no event between the timespan where turn is detected then insert 
        //new turn event with contiuing timestamp as of last event in the Event table
        if(results.rows.length<=0){
            this.insert_continue(tx,event,lat1,long1,speed,bearing,timestamp,event_row)
            console.log("Inserted turn")
        }
        //else update all the events recorded in the timespan where turn in recorded to turn event
        //In case the prediction of turn event is wrong then other events are not missed
        else{
            tx.executeSql("UPDATE Events set "+
            "event='"+event+"'"+
            " where last_timestamp >="+start_bearing_obj.timestamp+" and "+
            "curr_timestamp<=" + stop_bearing_obj.timestamp);
            console.log("Update into turn *****")
        }
      });
    }
    //Extend event when last event is equal to current event
    else{
        this.update(tx,lat1,long1,speed,bearing,timestamp,event_row)
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
    tx.executeSql("SELECT SUM(curr_timestamp-last_timestamp) FROM Events WHERE event !='stop'" ,[], (tx,results) => {
      total = results.rows.item(0)['SUM(curr_timestamp-last_timestamp)']
      this.setState({timestampSum:total})
    });

  this.progressbar_display('harsh_acc',tx)
  this.progressbar_display('running',tx)
  this.progressbar_display('stop',tx)
  this.progressbar_display('turn',tx)
  this.progressbar_display('deacc',tx)
  this.progressbar_display('short break',tx)
  this.progressbar_display('speeding',tx)
  this.progressbar_display('sharp_turn',tx)
  this.progressbar_display('acc',tx)
 });

}

//button start-stop text logic
trackingButton=() =>{
     var status = this.state.trackingStatus
     if(status=='Start Tracking')
     {
       //tracking status
       //changeing tracking button text
       this.setState({trackingStatus:'Stop Tracking'})
       //this.setState({v:'0'})
       this.start_tracking()
     }
     else
     {
       //tracking status
      //changeing tracking button text
       this.setState({trackingStatus:'Start Tracking'})
       //this.setState({v:'1'})
       this.stop_tracking()
     }

  }


start_tracking_ios=()=>{
    var settings = this.state.settings
    this.create()
    

    //configure GPS
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

    //obj 
    var obj = {location_prev:"none", start_bearing_obj:{}, stop_bearing_obj:{}, isTurn:0}

    BackgroundGeolocation.on('location', (location) => {
      if(obj.location_prev === 'none'){
        obj.location_prev=location
      }

      console.log("location",location)

      //return abs diff between bearing when the turn started and end
      var bearing_diff =  this.bearingLogic(location,obj)
      obj.location_prev = location
      console.log("B1:",obj.start_bearing_obj)
      console.log("B2:",obj.stop_bearing_obj)
      console.log("obj:",obj.isTurn)


      this.add(parseInt(location.time),  location.latitude,  location.longitude,  location.bearing,
                location.speed,  location.accuracy,  settings,  bearing_diff,  obj.start_bearing_obj,  obj.stop_bearing_obj)
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

   BackgroundGeolocation.start();

 }
//return abs diff between bearing when the turn started and end
bearingLogic=(location,obj)=>{

      var bearing_diff = Math.abs(location.bearing - obj.location_prev.bearing)
      console.log("prev:",obj.location_prev,location)
      var timestamp1 = location.time
      var bearing = location.bearing
      var lat = JSON.stringify(location.latitude)
      var long = JSON.stringify(location.longitude)

      console.log("Flag",obj.isTurn)

      console.log("bearing_diff1:",bearing_diff)
      //console.log("b1",b1)
      //turn started
      if(bearing_diff>7 || obj.isTurn == 1){
        console.log("flag:",obj.isTurn)
        //initallize bearing obj with previous location value and current location value
        if(obj.isTurn==0){
          obj.start_bearing_obj = {
              timestamp:parseInt(obj.location_prev.time),
              bearing: obj.location_prev.bearing,
              lat: JSON.stringify(obj.location_prev.latitude),
              long:JSON.stringify(obj.location_prev.longitude),
              speed:obj.location_prev.speed
            }
          obj.stop_bearing_obj = {
            timestamp:parseInt(location.time),
            bearing: location.bearing,
            lat: JSON.stringify(location.latitude),
            long:JSON.stringify(location.longitude),
            speed:location.speed
          }
          //now turn started
          obj.isTurn = 1
        }

        else{
        
          var timestamp_diff = (obj.stop_bearing_obj.timestamp - obj.start_bearing_obj.timestamp)
          //update end bearing object with current location values
          obj.stop_bearing_obj = {timestamp:timestamp1,bearing:bearing,lat: lat,long:long}
          //abs diffrence between start and stop bearing of turn (start fresh)
          bearing_diff = this.getAbsoluteAngle(obj.stop_bearing_obj.bearing - obj.start_bearing_obj.bearing)
          console.log(timestamp_diff)
          //timestamp_diff>12 sec then terminate turn
          if( timestamp_diff >= 12000){ 
            console.log(">=12")
            obj.isTurn = 0
          }

          //timestamp_diff>7 sec then check for significant bearing difference
          else if( timestamp_diff >= 7000){
            //terminate when significant bearing diff is detected
            if( bearing_diff>50){
              obj.isTurn = 0
            }
          }

        }

        bearing_diff = this.getAbsoluteAngle(obj.start_bearing_obj.bearing, obj.stop_bearing_obj.bearing)
      }

      return bearing_diff
  }

async start_tracking(){

    var value =   await AsyncStorage.getItem('settings');
    value = JSON.parse(value)
    console.log("New Settings:",value)
    this.setState({settings:value})

 
    if(Platform.OS ==='ios'){
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
  this.setState({trackingStatus:'Start tracking'})
  this.stop_tracking()
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
    var settings = this.state.settings

    if (granted) {
      this.create()

       FusedLocation.setLocationPriority(FusedLocation.Constants.HIGH_ACCURACY);
       //var location_prev =  FusedLocation.getFusedLocation();
       FusedLocation.setLocationPriority(FusedLocation.Constants.HIGH_ACCURACY);
       FusedLocation.setLocationInterval(2000);
       FusedLocation.setFastestLocationInterval(1000);
       FusedLocation.setSmallestDisplacement(0);

       FusedLocation.startLocationUpdates();
       //get location form gps
       var obj = {location_prev:"none",start_bearing_obj:{},stop_bearing_obj:{},flag:0}
       this.subscription = FusedLocation.on('fusedLocation', location => {
        
        location.timestamp = parseInt(location.timestamp)
        location.time =  (location.timestamp)


        if(obj.location_prev === 'none'){
          obj.location_prev=location
        }
  
        console.log("location",location)
  
        
        var bearing_diff =  this.bearingLogic(location,obj)
        obj.location_prev = location
        console.log("B1:",obj.start_bearing_obj)
        console.log("B2:",obj.stop_bearing_obj)
  
        this.add(parseInt(location.time),  location.latitude,  location.longitude,  location.bearing,
        location.speed,  location.accuracy,  settings,  bearing_diff,  obj.start_bearing_obj,  obj.stop_bearing_obj)      
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
                  style = {styles.Button} onPress={this.trackingButton}>
                  <Text style = {styles.ButtonText}>{this.state.trackingStatus}</Text>
                  </TouchableOpacity>
         
                  <TouchableOpacity
                    onPress={() => navigate("DrivingEvents")}
                    style = {styles.Button}>
                  <Text style = {styles.ButtonText}>View Event</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => navigate("DrivignMap")}
                    style={styles.Button}>
                    <Text style = {styles.ButtonText}>Driving Map</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => this.test1Static()}
                    style={styles.Button}>
                    <Text style = {styles.ButtonText}>Upload</Text>
                  </TouchableOpacity>
             </View>
            </View>
          )
    }
  }



const event_query = '(sync,event,last_timestamp,curr_timestamp,last_lat,curr_lat,last_long,curr_long,last_bearing,curr_bearing,last_speed,curr_speed) '
