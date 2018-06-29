import SQLite from 'react-native-sqlite-storage'

export default class AppDB{

constructor(name,location){
   this.name = name;
   this.location= location;
   this.db = SQLite.openDatabase({name:this.name,location: this.location});
   console.log("Initialize",this.name,this.location)
}


create=()=>{
    //Create required table
      var db = this.db
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


  getLastRow(logicLoop, start_bearing_obj, stop_bearing_obj, event, lat1, long1, speed, bearing, timestamp, bearing_diff, settings){
    console.log("In app DB")
    this.db.transaction((tx)=>{

      tx.executeSql('SELECT * from Events ORDER BY id DESC LIMIT 1', [], (tx, results) => {
        var event_row = results.rows.item(0) //last record from event database
        //Determines driving events
        logicLoop(tx,event_row,start_bearing_obj,stop_bearing_obj,event,lat1,long1,speed,bearing,timestamp,bearing_diff,settings)

      });

    })

  }

  //insert event in continious timestamp (opposite of insert_contiune)
  insert_continue(tx,event,lat1,long1,speed,bearing,timestamp,event_row){
    tx.executeSql("Insert into Events "+event_query+" values(0,'"+event+"',"+event_row.curr_timestamp+","+timestamp+",'"+event_row.curr_lat+"','"+lat1+"','"+event_row.curr_long+"','"+long1+"',"+event_row.curr_bearing+","+bearing+","+event_row.curr_speed+","+speed+");")
  }
  //insert event in non continious timestamp i.e last timestamp of last event is not equal to current time of current event
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

  insert_turn(tx,start_bearing_obj,stop_bearing_obj,event,lat1,long1,speed,bearing,timestamp,event_row){
    tx.executeSql('SELECT * from Events' + " where last_timestamp >="+start_bearing_obj.timestamp+" and "+
    "curr_timestamp<=" + stop_bearing_obj.timestamp , [], (tx, results) => {
      //if there is no event between the timespan where turn is detected then insert
      //new turn event with contiuing timestamp
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
          console.log("Update into turn")
      }
    });
  }

  getTimestampSum(callback){
    console.log("getTimeStamp")
      this.db.transaction((tx) => {
      tx.executeSql("SELECT SUM(curr_timestamp-last_timestamp) FROM Events WHERE event !='stop'" ,[], (tx,results) => {
        total = results.rows.item(0)['SUM(curr_timestamp-last_timestamp)']
        console.log("callback")
        console.log(total)
        callback(total,tx)
      });
    })
  }

  getEventTimestampSum(tx,event,callback){
    tx.executeSql("SELECT SUM(curr_timestamp-last_timestamp) FROM Events WHERE event ='"+event+"'" ,[], (tx, results) => {
      eventTimeSum= results.rows.item(0)['SUM(curr_timestamp-last_timestamp)']
      callback(eventTimeSum)
    })
  }

  selectEvent(time1,time2,callback){
    this.db.transaction((tx) => {
        tx.executeSql('SELECT * FROM Events WHERE curr_timestamp >= '+time1+' and last_timestamp <='+time2, [], (tx, results) => {
        console.log("SELECT completed");
        callback(results);
      });
    });
  }

  delete(){
    console.log("Delete")
    this.db.transaction((tx) => {
        tx.executeSql("delete from Events")
        tx.executeSql("delete from Location")
    });
  }


}

const event_query = '(sync,event,last_timestamp,curr_timestamp,last_lat,curr_lat,last_long,curr_long,last_bearing,curr_bearing,last_speed,curr_speed) '
