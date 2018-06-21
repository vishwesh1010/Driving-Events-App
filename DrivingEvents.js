import React, { Component } from 'react';
import { Text, TouchableOpacity, View,Image,FlatList } from 'react-native';
import DateTimePicker from 'react-native-modal-datetime-picker';
import SQLite from 'react-native-sqlite-storage'
import images from './images'
import {get_am_or_pm} from './main_functions'
import {styles} from './styles'

export default class DrivingEvents extends Component {


  static navigationOptions = ({ navigation }) => {
    //getting in class params
     const params = navigation.state.params || {};

     return{
      headerTitle: "Drive Events",
      headerTintColor: 'white',
      headerStyle:{backgroundColor:'#00897B'},
      headerRight: (
        <TouchableOpacity style={{marginRight:10}}  onPress={params.refresh}>
          <Image style={styles.icon} source={images.refresh}/>
        </TouchableOpacity>
      ),
     }
    };

  state = {
    isDateTimePickerVisible1: false,
    isDateTimePickerVisible2: false,

    time1:'',
    time2:'',
    displaytime1:'dsfasd',
    displaytime2:'',
    names:[]
  };


componentDidMount(){
  var current_time = new Date()
  var mid_night_time = new Date()
  mid_night_time.setHours(0,0,0,0)

  var dateString = current_time.toString().split(" ")
  var dateString1 = current_time.toString().split(" ")

  var displaytime1 = dateString.splice(1,2).join(' ')+'  12:00 AM'


  var ampm = " am"
  if(current_time.getHours()>12){
    ampm = " pm"
  }

  var displaytime2 = dateString1.splice(1,2).join(' ')+"  "+current_time.getHours()+':'+current_time.getMinutes()+ampm

  console.log('dataString;',displaytime1)
  console.log('timestamp:',current_time.getTime())

  this.setState({displaytime1:displaytime1,
                time1:mid_night_time.getTime(),
                displaytime2:displaytime2,
                time2:current_time.getTime()
              })

  //this.refresh()

   }

   componentWillMount(){
     //setParams is used to call in class function from navigation bar at top of this code
     this.props.navigation.setParams({ refresh: this.refresh});
   }


   //updates the time2 and rerenders the component
   refresh=()=>{
     var current_time = new Date()
     this._handleDatePicked2(current_time)
   }

   //timestamp filter
   filter=()=>{
     //this.create()
       var l = []
       var db = SQLite.openDatabase({name: 'my.db', location: 'default'});
       var time1 = this.state.time1
       var time2 = this.state.time2
       console.log(time1)
       console.log(time2)

       db.transaction((tx) => {
       tx.executeSql('SELECT * FROM Events WHERE last_timestamp >= '+time1+' and curr_timestamp <= '+time2, [], (tx, results) => {
         console.log("SELECT completed");
         var len = results.rows.length;
         console.log(len)
         var t = true
             for (let i = 0; i < len; i++) {
               console.log("In Loop")
               var row = results.rows.item(i);
               var d = new Date(row.curr_timestamp)
               var e = new Date(row.last_timestamp)
               var date = d.getDate() + '/' + (d.getMonth()+1) + '/' + d.getFullYear() +" "+ d.getHours() +":"+d.getMinutes()+":"+d.getSeconds()
               var date1 =  e.getHours() +":"+e.getMinutes()+":"+e.getSeconds()
               //console.log(row)
                   var obj = {event:row.event,last_timestamp:date,curr_timestamp:date1,last_speed:row.last_speed.toFixed(2),curr_speed:row.curr_speed.toFixed(2)}
                 l.unshift(obj)
             }
             console.log("l",l)
             this.setState({ names:l}, function() {
                   console.log(this.state.names)
           });

       });
     });
   }




  _showDateTimePicker2 = () => this.setState({ isDateTimePickerVisible2: true });

  _hideDateTimePicker2 = () => this.setState({ isDateTimePickerVisible2: false });

  _showDateTimePicker1 = () => this.setState({ isDateTimePickerVisible1: true });

  _hideDateTimePicker1 = () => this.setState({ isDateTimePickerVisible1: false });

  _handleDatePicked2= (datetime) => {
    var dateString = datetime.toString().split(" ")
    var temp = get_am_or_pm(datetime.getHours())
    hour = temp[0]
    var ampm = temp[1]

    var displaytime1 = dateString.splice(1,2).join(' ')+" "+hour+':'+datetime.getMinutes()+ampm

    this.setState({
      displaytime2:displaytime1,
      time2:datetime.getTime()
    },function(){
      this.filter()
    })

    this._hideDateTimePicker2();
  }

  _handleDatePicked1= (datetime) => {

    var dateString = datetime.toString().split(" ")
    var temp = get_am_or_pm(datetime.getHours())
    hour = temp[0]
    var ampm = temp[1]

    var displaytime1 = dateString.splice(1,2).join(' ')+" "+hour+':'+datetime.getMinutes()+ampm

    this.setState({
      displaytime1:displaytime1,
      time1:datetime.getTime()
    },function(){
      this.filter()
    })

    this._hideDateTimePicker1();
  };

  render () {
    return (
      <View style={styles.container}>

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
    <View style={styles.drivingEvents}>
      <FlatList
      data={this.state.names}
      renderItem={({item}) =>
      <View style={{flexDirection: 'row',alignItems: 'center',backgroundColor:'white',justifyContent: 'space-between',borderBottomWidth:1,borderBottomColor:'#ECEFF1'}}>
        <View style={styles.eventTextContainer}>
        <Text style={styles.eventNameText} >{item.event}</Text>
        </View>

      <View style={styles.eventInfoContainer}>
      <View style={{ flex:2, flexDirection: 'row'}}>
        <Text style={styles.eventInfoText} >{item.last_timestamp}</Text>
      <Text style={styles.eventInfoText} >to</Text>
        <Text style={styles.eventInfoText} >{item.curr_timestamp}</Text>
      </View>
      <View style={{ flex:2, flexDirection: 'row'}}>
         <Text style={styles.eventInfoText} >{item.last_speed}</Text>
       <Text style={styles.eventInfoText} >to</Text>
         <Text style={styles.eventInfoText} >{item.curr_speed}</Text>
       <Text style={styles.eventInfoText} >km/h</Text>
      </View>
      </View>
    </View>
      }

      keyExtractor={(item, index) => index.toString()}
      />
      </View>
      </View>
    );
  }
}
