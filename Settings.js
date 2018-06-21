

  import React, { Component } from 'react'
  import { View, Text, TouchableOpacity,AsyncStorage,Image,Slider } from 'react-native'
  import images from './images'
  import {styles} from './styles'


  export default class Settings extends Component {
    static navigationOptions = ({ navigation }) => {
        return{
        headerTitle: "Settings",
        headerTintColor: 'white',
        headerStyle:{backgroundColor:'#00897B'},
        headerLeft:null,
        headerRight: (
          <TouchableOpacity style={{marginRight:10}} onPress={() => navigation.navigate("Bar")}>
            <Image style={styles.icon} source={images.save}/>
          </TouchableOpacity>
        ),
      }
    };


  state={
    short_break:0,
    acceleration:0,
    deacceleration:0,
    speeding:0,
    turn:0
  }

 async componentDidMount(){
   console.log("Component")
   try {
     var settings = await AsyncStorage.getItem('settings');
     settings = JSON.parse(settings)

   } catch (error) {
     console.log(error)
   }

      this.setState({
        acceleration:settings.acceleration,
        deacceleration:settings.deacceleration,
        short_break:settings.short_break,
        speeding:settings.speeding,
        turn:settings.turn,
        running:settings.running
      })
      console.log("setState")
  }


  async save(state){
    console.log("save",state)
    try{
        await AsyncStorage.setItem('settings', JSON.stringify({
        acceleration:parseFloat(this.state.acceleration),
        deacceleration:parseFloat(this.state.deacceleration),
        short_break:parseFloat(this.state.short_break),
        turn:parseFloat(this.state.turn),
        speeding:parseFloat(this.state.speeding)
      }
    ))
    }catch(error){
      console.log(error)
    }

  }

    render(){
      //const { navigate } = this.props.navigation;
      console.log("render",this.state)
        return (
          <View>

              <View style={styles.settingsMain}>

                <View style={styles.slider}>
                  <View style={styles.sliderText}>
                  <Text>Short Break</Text>
                <Text>{this.state.short_break}  km/h</Text>
                </View>
                  <Slider maximumValue={80} onValueChange={(value)=>{this.setState({short_break:value.toFixed(2)})}} value={parseFloat(this.state.short_break)} onSlidingComplete={()=>this.save(this.state)}/>
                </View>

                <View style={styles.slider}>
                  <View style={styles.sliderText}>
                  <Text>Acceleration</Text>
                  <Text>{this.state.acceleration}  km/h</Text>
                </View>
                  <Slider value={parseFloat(this.state.acceleration)} maximumValue={80} onValueChange={(value)=>{this.setState({acceleration:value.toFixed(2)})}} onSlidingComplete={()=>this.save(this.state)}/>
                </View>

                <View style={styles.slider}>
                  <View style={styles.sliderText}>
                  <Text>Deacceleration</Text>
                  <Text>{this.state.deacceleration}  km/h</Text>
                </View>
                  <Slider value={parseFloat(this.state.deacceleration)} maximumValue={80} onValueChange={(value)=>{this.setState({deacceleration:value.toFixed(2)})}} onSlidingComplete={()=>this.save(this.state)}/>
                </View>

                <View style={styles.slider}>
                  <View style={styles.sliderText}>
                  <Text>Sharp Turn</Text>
                  <Text>{this.state.turn} km/h</Text>
                </View>
                  <Slider value={parseFloat(this.state.turn)} maximumValue={80} onValueChange={(value)=>{this.setState({turn:value.toFixed(2)})}} onSlidingComplete={()=>this.save(this.state)}/>
                </View>


                <View style={styles.slider}>
                  <View style={styles.sliderText}>
                  <Text>Speeding</Text>
                  <Text>{this.state.speeding}  km/h</Text>
                </View>
                  <Slider value={parseFloat(this.state.speeding)} maximumValue={120} onValueChange={(value)=>{this.setState({speeding:value.toFixed(2)})}} onSlidingComplete={()=>this.save(this.state)}/>
                </View>


              </View>


          </View>


      )
    }
  }
