/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 * @flow
 */

import React, { Component } from 'react';
import {
  Text,
  View,
  Image,
  TouchableOpacity
} from 'react-native';
import SQLite from 'react-native-sqlite-storage'
import MapView from 'react-native-maps';
import { Marker,Polyline } from 'react-native-maps';
import DateTimePicker from 'react-native-modal-datetime-picker';
import images from './images'
import {get_am_or_pm} from './main_functions'
import {styles} from './styles'


export default class Location extends React.Component{
    static navigationOptions = ({ navigation }) => {
    const params = navigation.state.params || {};
    return{
    headerTitle: "Drive Map",
    headerTintColor: 'white',
    headerStyle:{backgroundColor:'#00897B'},
    headerRight: (
      <TouchableOpacity style={{marginRight:10}} onPress={params.refresh}>
        <Image style={styles.icon} source={images.refresh}/>
      </TouchableOpacity>
    ),

    }
  };


    state={
      region: {
      latitude: 22.280862,
      longitude: 73.190397,
      latitudeDelta: 0.0922,
      longitudeDelta: 0.0421,
      },
      polyline_data:{curr_lat:22.280862,curr_long:73.190397,curr_speed:0.00,last_speed:0.00},
      polylines:[],
      isDateTimePickerVisible1: false,
      isDateTimePickerVisible2: false,
      time1:'',
      time2:'',
      displaytime1:'timet',
      displaytime2:'current',
    }

    get_am_or_pm(hour){
      ampm = " am"
      var temp_hour = hour
      if(hour==12){
        temp_hour = 12
        ampm = " pm"
      }
      if(hour==0){
        temp_hour = 12
        ampm = " am"
      }
      if(hour>12){
        temp_hour = hour-12
        ampm = " pm"
      }
      return [temp_hour,ampm]
    }

    _showDateTimePicker2 = () => this.setState({ isDateTimePickerVisible2: true });

    _hideDateTimePicker2 = () => this.setState({ isDateTimePickerVisible2: false });

    _showDateTimePicker1 = () => this.setState({ isDateTimePickerVisible1: true });

    _hideDateTimePicker1 = () => this.setState({ isDateTimePickerVisible1: false });

    _handleDatePicked2= (datetime) => {
      console.log("DataPick2")
        var dateString = datetime.toString().split(" ")
        var hour  = datetime.getHours()
        var temp = get_am_or_pm(hour)
        hour = temp[0]
        var ampm = temp[1]

        var displaytime1 = dateString.splice(1,2).join(' ')+" "+hour+':'+datetime.getMinutes()+ampm
        console.log(displaytime1,"2")
        this.setState({
          displaytime2:displaytime1,
          time2:datetime.getTime()
        }, function() {
                this.updateMap()
        });
        this._hideDateTimePicker2()
    }

    _handleDatePicked1= (datetime) => {

        var dateString = datetime.toString().split(" ")
        var hour  = datetime.getHours()
        var temp = get_am_or_pm(hour)
        hour = temp[0]
        var ampm = temp[1]

        var displaytime1 = dateString.splice(1,2).join(' ')+" "+hour+':'+datetime.getMinutes()+ampm

        console.log(displaytime1,"1")
        this.setState({
          displaytime1:displaytime1,
          time1:datetime.getTime()
        }, function() {
            this.updateMap()
        });
        this._hideDateTimePicker1();
    };


    updateMap=()=>{
        var db = SQLite.openDatabase({name: 'my.db', location: 'default'});
        var time1 = this.state.time1
        var time2 = this.state.time2
        var polyline_data = []
        console.log("time1",time1)
        console.log("time2",time2)

        db.transaction((tx) => {
            var polylines = []
            tx.executeSql('SELECT * FROM Events WHERE curr_timestamp >= '+time1+' and last_timestamp <='+time2, [], (tx, results) => {
            console.log("SELECT completed");
            var len = results.rows.length;
            console.log("length:",len)


            console.log(len)
            if(len<=0){
              this.setState({polylines:[]})
              return
            }

            for (let i = 0; i < len; i++) {
              var row = results.rows.item(i);
              //console.log("tim:",row.last_timestamp)

              if(i==len-1){
                polyline_data = row
              }
              var one_polyline = [[{latitude:JSON.parse(row.last_lat),longitude:JSON.parse(row.last_long)},{latitude:JSON.parse(row.curr_lat),longitude:JSON.parse(row.curr_long)}],events_color[row.event],row]
              polylines.push(one_polyline)
            }


            //console.log("polylines",polylines)

            this.setState({
              polyline_data:polyline_data,
              polylines:polylines,
              region: {
                latitude: parseFloat(polyline_data.curr_lat),
                longitude:parseFloat(polyline_data.curr_long),
                latitudeDelta: 0.0922,
                longitudeDelta: 0.0421
              }
            });
          });
      });

    }
    componentDidMount(){

        var current_time = new Date()
        var mid_night_time = new Date()
        mid_night_time.setHours(0,0,0,0)

        var dateString = current_time.toString().split(" ")
        var dateString1 = current_time.toString().split(" ")

        var displaytime1 = dateString.splice(1,2).join(' ')+'  12:00 am'


        var ampm = " am"
        if(current_time.getHours()>12){
        ampm = " pm"
        }

        var displaytime2 = dateString1.splice(1,2).join(' ')+"  "+current_time.getHours()+':'+current_time.getMinutes()+ampm

        this.setState({displaytime1:displaytime1,
                      time1:mid_night_time.getTime(),
                      displaytime2:displaytime2,
                      time2:current_time.getTime()
                    });
    }

    componentWillMount(){
      this.props.navigation.setParams({ refresh: this.refresh});
    }

    refresh=()=>{
      var current_time = new Date()
      this._handleDatePicked2(current_time)
      //this.filter()
    }

    shouldComponentUpdate(nextProps, nextState) {
        if( this.state.polyline_data.curr_lat !== nextState.polyline_data.curr_lat || this.state.polylines!==nextState.polylines || this.state.time1!==nextState.time1 ||
        this.state.time2!==nextState.time2 || this.state.displaytime1!==nextState.displaytime1 ||  this.state.displaytime2!==nextState.displaytime2 || this.state.isDateTimePickerVisible1!==nextState.isDateTimePickerVisible1 || this.state.isDateTimePickerVisible2!==nextState.isDateTimePickerVisible2 ){
          console.log("True")
        return true
        }
        return false
    }




  render() {

    var polylines= this.state.polylines
    console.log(polylines)
    var polylines = polylines.map((data)=>{
      //console.log("data",data)
      return(
        <Polyline
        coordinates={data[0]}
        strokeWidth={5}
        strokeColor={data[1]}
        onPress={()=>{
          console.log("Curr timestad:",this.state.polyline_data.curr_timestamp)
          var d = new Date(this.state.polyline_data.curr_timestamp)
          var date = d.getDate() + '/' + (d.getMonth()+1) + '/' + d.getFullYear() +" "+ d.getHours() +":"+d.getMinutes()+":"+d.getSeconds()
          this.setState({polyline_data:data[2],polylineTimestamp:date})
        }}/>
      )
    })


    return (
      <View style={{flex: 1,width:'100%'}}>
        <View style={styles.datetime}>

          <TouchableOpacity onPress={this._showDateTimePicker1}>
            <Text style={{fontWeight:'bold'}}>{this.state.displaytime1}</Text>
          </TouchableOpacity>
          <DateTimePicker
            isVisible={this.state.isDateTimePickerVisible1}
            onConfirm={this._handleDatePicked1}
            onCancel={this._hideDateTimePicker1}
            mode = 'datetime'
            is24Hour ={false}
          />
        <View style={styles.partitionLine}></View>

        <TouchableOpacity onPress={this._showDateTimePicker2}>
            <Text style={{fontWeight:'bold'}}>{this.state.displaytime2}</Text>
        </TouchableOpacity>
          <DateTimePicker
            isVisible={this.state.isDateTimePickerVisible2}
            onConfirm={this._handleDatePicked2}
            onCancel={this._hideDateTimePicker2}
            mode = 'datetime'
            is24Hour ={false}
          />
      </View>
      <View style={styles.container}>
        <View style ={{height:'100%',width:'100%'}}>
          <MapView
            onRegionChangeComplete = {(region)=>{this.setState({region:region})
            console.log(region)}}
            style={styles.map}
            region={this.state.region}>

            {polylines}

            <Marker
              coordinate={{latitude:JSON.parse(this.state.polyline_data.curr_lat),longitude:JSON.parse(this.state.polyline_data.curr_long)}}/>
          </MapView>
        </View>

        <View style={styles.polylineContent}>

          <View style={styles.polyLineText}>
            <Text>Time: {this.state.polylineTimestamp}</Text>
            <Text>Event: {this.state.polyline_data.event}</Text>
          </View>
          <View style={styles.polyLineText}>
            <Text>Bearing Start: {this.state.polyline_data.last_bearing}</Text>
            <Text>Bearing End:{this.state.polyline_data.curr_bearing}</Text>
          </View>
          <View style={styles.polyLineText}>
            <Text>Speed Start:{this.state.polyline_data.last_speed.toFixed(2)} km/h</Text>
            <Text>Speed End:{this.state.polyline_data.curr_speed.toFixed(2)} km/h</Text>
          </View>
        </View>
      </View>
      <View style={styles.mapLegend}>
        <Text style={{color:events_color["speeding"],fontWeight: 'bold'}}>&#9632; Speeding  </Text>
        <Text style={{color:events_color["acc"],fontWeight: 'bold'}}>&#9632; Acceleration  </Text>
        <Text style={{color:events_color["stop"],fontWeight: 'bold'}}>&#9632; Stop  </Text>
        <Text style={{color:events_color["harsh_acc"],fontWeight: 'bold'}}>&#9632; Harsh Acceleration  </Text>
        <Text style={{color:events_color["deacc"],fontWeight: 'bold'}}>&#9632; Break  </Text>
        <Text style={{color:events_color["short_break"],fontWeight: 'bold'}}>&#9632; Short Break  </Text>
        <Text style={{color:events_color["turn"],fontWeight: 'bold'}}>&#9632; Turn  </Text>
        <Text style={{color:events_color["sharp turn"],fontWeight: 'bold'}}>&#9632; Sharp Turn  </Text>
        <Text style={{color:events_color["running"],fontWeight: 'bold'}}>&#9632; Running  </Text>
      </View>

    </View>
    );
  }
}



var events_color = {
  "deacc":"#9575CD",
  "stop":"#FFCDD2",
  "acc":"#EF9A9A",
  "running":"#81C784",
  "speeding":"#E53935",
  "harsh_acc":"#F57C00",
  "sharp turn":"#FFD740",
  "turn":"#64B5F6",
  "short_break":"#795548"
}
