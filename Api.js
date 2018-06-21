import React, { Component } from 'react'
import { View, Text, TouchableOpacity,Platform, TextInput,Alert, StyleSheet,ScrollView,Image,Slider,Button ,TouchableHighlight,PermissionsAndroid} from 'react-native'
import SQLite from 'react-native-sqlite-storage'


export default class Api extends Component {

  componentDidMount(){
    var l = []
    var db = SQLite.openDatabase({name: 'my.db', location: 'default'});
    db.transaction((tx) => {
      tx.executeSql('SELECT * FROM Events WHERE sync=0 LIMIT 1000',[], (tx, results) => {
        var len = results.rows.length;
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


        var _ = fetch('http://localhost:3000/connect',{
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
  render() {
    return(
      <View><Text>Hello</Text></View>
    )

  }
}
