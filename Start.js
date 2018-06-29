import React, { Component } from 'react'
import { View, Text,Image,AsyncStorage,StatusBar} from 'react-native'
import SQLite from 'react-native-sqlite-storage'
import images from './images'
import { StackActions, NavigationActions } from 'react-navigation';
import {styles} from './styles'
import AppDB from './AppDB'

var appDB = new AppDB("my.db","location")

export default class Start extends Component {

  static navigationOptions = ({ navigation }) => {
    return{
      header:null,
  }
};

  api=()=>{
    console.log("api")
    var l = []
    var db = SQLite.openDatabase({name: 'my.db', location: 'default'});
    db.transaction((tx) => {
      tx.executeSql('SELECT * FROM Events WHERE sync=0 LIMIT 1000',[], (tx, results) => {
        var len = results.rows.length;
        if(len<=0){return}
        for (let i = 0; i < len; i++) {
            var row = results.rows.item(i);
            row.location = {type: "Point", coordinates:[JSON.parse(row.last_long), JSON.parse(row.last_lat)]}
            l.push(row)
            console.log(row)
        }
        console.log("l:",l)
        var  id_list = (l.map(obj => { return obj.id }));
        var id_min = Math.min.apply(null,id_list)
        var id_max = Math.max.apply(null,id_list)


        var _ = fetch('http://localhost:3000/profile/connect?event=stop',{
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({data:l})
        })
          .then((response) => response.json())
          .then((responseJson) => {
            console.log(responseJson)
            console.log(id_max,id_min)
            var db = SQLite.openDatabase({name: 'my.db', location: 'default'});
            db.transaction((tx) => {
              if(responseJson.status=='success'){
                tx.executeSql("UPDATE Events set sync=1 WHERE id>="+id_min+" AND "+"id<="+id_max)
            }
            return responseJson;
            })
          })
          .catch((error) => {
            console.error(error);
          });


      })

    })
  }


    /*Move to setting screen*/
    firstTime() {
        appDB.create()
        const resetAction = StackActions.reset({
          index: 1,
          actions: [
            NavigationActions.navigate({ routeName: 'DashBoard' }),
            NavigationActions.navigate({ routeName: 'Settings' })
          ]
        });

        this.props.navigation.dispatch(resetAction);
    }

    /*Move to Dashboard*/
    nextTime() {
        const resetAction = StackActions.reset({
          index: 0,
          actions: [
            //NavigationActions.navigate({ routeName: 'Location' }),
            NavigationActions.navigate({ routeName: 'DashBoard' })
          ]
        });

        this.props.navigation.dispatch(resetAction);
    }
     
    componentDidMount(){
      setTimeout(()=>{this.startup()},1500)
    }
    async initialzeSettings(){
      try {
        AsyncStorage.setItem('settings', JSON.stringify({speeding:60,acceleration:20,deacceleration:20,short_break:20,turn:30}));
      } catch (error) {
       Alert.alert(error,"initialzeSettings")
      }

    }

    async startup(){
      try {
        const value =  await  AsyncStorage.getItem('startup');
        console.log("Value",value)
        if (value === null){
          AsyncStorage.setItem('startup', "started");
          this.initialzeSettings()
          this.firstTime()

        }
        else{
          this.nextTime()
        }
      } catch (error) {
        Alert.alert(error,"startup")
    }
  }

  render(){
      return (
              <View style = {styles.container}>
                    <StatusBar
                backgroundColor="#004D46"
                barStyle="light-content"
                />
                <Image style={styles.appLogo} source={images.icon} onLoad={()=>console.log("image loaded")}/>
                <Text style = {styles.appNameText}>Driving Events</Text>
              </View>
        )
  }
}

