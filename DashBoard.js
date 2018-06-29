import React, { Component } from 'react'
import { View, Text, TouchableOpacity,Platform,AppState,Alert,AsyncStorage,Image,PermissionsAndroid,Dimensions,StatusBar} from 'react-native'
import { AnimatedCircularProgress } from 'react-native-circular-progress'
import FusedLocation from 'react-native-fused-location';
import BackgroundGeolocation from 'react-native-mauron85-background-geolocation';
import images from './images'
import RNSettings from 'react-native-settings'
import {styles} from './styles'
import AppDB from './AppDB'
console.disableYellowBox = true

var appDB = new AppDB("my.db","default")
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


  //called when component is launched
  async componentWillMount(){
    var height = Dimensions.get('screen').height
    var width = Dimensions.get('screen').width
    var ratio_large = (height)/6
    var ratio_small = (height)/8


    console.log(height,width)

    appDB.getTimestampSum(this.progressbar_display_all)
    
    console.log("WillMount")
    setInterval(()=>{
      //update progress bars every second if tracking is on and app is not in background
      if(AppState.currentState=='active' && this.state.trackingStatus=='Stop Tracking'){
        console.log(AppState.currentState)
        appDB.getTimestampSum(this.progressbar_display_all)
      }

    },1000)

    this.setState({ratio_large:ratio_large,ratio_small})

  }

  progressbar_display_all=(total,tx)=>{

    this.setState({timestampSum:total})

    this.progressbar_display('harsh_acc',tx)
    this.progressbar_display('running',tx)
    this.progressbar_display('stop',tx)
    this.progressbar_display('turn',tx)
    this.progressbar_display('deacc',tx)
    this.progressbar_display('short break',tx)
    this.progressbar_display('speeding',tx)
    this.progressbar_display('sharp_turn',tx)
    this.progressbar_display('acc',tx)
  
  }



  progressbar_display=(event,tx)=>{
  
    var percentage = 0
    appDB.getEventTimestampSum(tx,event,(eventTimeSum)=>{
      console.log(eventTimeSum,"eventTimeStamp")
      if(eventTimeSum){
        console.log(event,(eventTimeSum/this.state.timestampSum)*100)
        percentage = (eventTimeSum/this.state.timestampSum)*100

        var obj = {}
        obj[event] =percentage
        this.setState(obj);
      }
    })
       
  }



add = (timestamp, lat, long, bearing, speed, accu, settings, bearing_diff, start_bearing_obj, stop_bearing_obj)=>{
      var speed = speed*3.6 //convert speed from m/s to km/h
      var event = "null"
      console.log(event)
 

      //var accu1 = accu.toFixed(2)
      var lat1 = JSON.stringify(lat)
      var long1 = JSON.stringify(long)

      //insert all the required attribute in Location database
      //tx.executeSql("Insert into Location (timestamp,lat,long,bearing,speed,accuracy) values("+timestamp+",'"+lat1+"','"+long1+"',"+bearing+","+speed+","+accu1+");")
      //get the last record from the database
      //call loginLoop as call back wiht event_row as last event
      appDB.getLastRow(this.logicLoop, start_bearing_obj, stop_bearing_obj, event, lat1, long1, speed, bearing, timestamp, bearing_diff, settings)

  }

//Determines driving event                
logicLoop=(tx,event_row,start_bearing_obj,stop_bearing_obj,event,lat1,long1,speed,bearing,timestamp,bearing_diff,settings)=>{
    console.log("In logic")

    //when there are no recordes in Events table
    if(!event_row){
        appDB.insert_new(tx,event,timestamp,lat1,long1,speed,bearing)
        //tx.executeSql("Insert into Events "+event_query+" values(0,'stop',"+timestamp+","+timestamp+",'"+lat1+"','"+lat1+"','"+long1+"','"+long1+"',"+bearing+","+bearing+","+speed+","+speed+");")
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
  console.log("Helllo")
  //whene there is significant diffrenece beetween last and current timestamp
  //if time stamp difference between last event and current event is greater than 60*3s than initiate new event wiht current timestamp
  
  if(timestamp - event_row.last_timestamp > 60000*3){
    appDB.insert_new(tx,event,timestamp,lat1,long1,speed,bearing)
    console.log("1evnet")
   }
   //Continue adding events with continious timestamp
  else if(event_row.event!=event || timestamp - event_row.last_timestamp > 15000){
    appDB.insert_continue(tx,event,lat1,long1,speed,bearing,timestamp,event_row)
    console.log("2evnet")
  }
  //extend event
  else{
    appDB.update(tx,lat1,long1,speed,bearing,timestamp,event_row)
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
  console.log("get:",event)
  return event
}

turn(tx,start_bearing_obj,stop_bearing_obj,event,lat1,long1,speed,bearing,timestamp,event_row){
    //significant time difference between last and current timestamp(55sec here)
    if(timestamp - event_row.last_timestamp > 55*1000){
    appDB.insert_new(tx,event,lat1,long1,speed,bearing)
    }

    //when last event is not equal to current event
    else if(event_row.event!=event){
        appDB.insert_turn(tx,start_bearing_obj,stop_bearing_obj,event,lat1,long1,speed,bearing,timestamp,event_row)
    }
    //Extend event when last event is equal to current event
    else{
        appDB.update(tx,lat1,long1,speed,bearing,timestamp,event_row)
    }
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
      interval: 5000,
      fastestInterval: 3000,
      activitiesInterval: 3000,
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
    'Geo_App wants to know your location',
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

       FusedLocation.setLocationPriority(FusedLocation.Constants.HIGH_ACCURACY);
       FusedLocation.setLocationPriority(FusedLocation.Constants.HIGH_ACCURACY);
       FusedLocation.setLocationInterval(2000);
       FusedLocation.setFastestLocationInterval(1000);
       FusedLocation.setSmallestDisplacement(0);

       FusedLocation.startLocationUpdates();
       //get location form gps
       var obj = {location_prev:"none",start_bearing_obj:{},stop_bearing_obj:{},isTurn:0}
       this.subscription = FusedLocation.on('fusedLocation', location => {
        
        location.timestamp = parseInt(location.timestamp)
        location.time =  (location.timestamp)


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
   deleteDB(){
    Alert.alert(
      'Delete Data',
      'Tap OK to clear AppData',
      [
        {text: 'Cancel', onPress: () => console.log('Cancel Pressed'), style: 'cancel'},
        {text: 'OK', onPress: () => {
          appDB.delete()
          this.setState(
            {
              stop:0.0,
              acc:0.0,
              turn:0.0,
              deacc:0.0,
              short_break:0.0,
              running:0.0,
              speeding:0.0,
              sharp_turn:0.0,
              harsh_acc:0.0,
            }
          )
        }},
      ],
      { cancelable: false }
    )
   }

    render(){
      const { navigate } = this.props.navigation;

        return (

                <View style = {styles.barContainer}>
                  <StatusBar
                backgroundColor="#004D46"
                barStyle="light-content"
                />
                <View style={{flex:1,justifyContent:'space-around'}}>
                  <View style = {styles.mainBarContainer}>
                      <View style={{alignItems:'flex-end'}}>
                          <AnimatedCircularProgress
                            size={this.state.ratio_large}
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

                      <View style={{alignItems:'flex-start',padding:10}} >
                          <Text>Average Overall Score</Text>
                          
                      </View>
                </View>

                <View style = {styles.linearBarContainer}>
                    <View style={styles.progressBar}>
                        <AnimatedCircularProgress
                          size={this.state.ratio_small}
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
                          size={this.state.ratio_small}
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
                  size={this.state.ratio_small}
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
                          size={this.state.ratio_small}
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
              </View>

              <View style-={{flex:1,justifyContent:'space-between'}}>    
                 <TouchableOpacity
                  style = {styles.Button} onPress={this.trackingButton}>
                  <Text style = {styles.ButtonText}>{this.state.trackingStatus}</Text>
                  </TouchableOpacity>

                  <View style={{flexDirection:'row',justifyContent:'space-between'}}>
                  <TouchableOpacity
                    onPress={() => navigate("DrivingEvents")}
                    style = {[styles.Button,{flex:1}]}>
                  <Text style = {styles.ButtonText}>View Event</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => navigate("DrivingMap")}
                    style = {[styles.Button,{flex:1}]}>
                    <Text style = {styles.ButtonText}>Driving Map</Text>
                  </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    onPress={() => this.deleteDB()}
                    style={styles.Button}>
                    <Text style = {styles.ButtonText}>Delete</Text>
                  </TouchableOpacity>
             </View>
            </View>
          )
    }
  }
var per = Dimensions.get('window')[0]