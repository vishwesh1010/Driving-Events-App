import{StyleSheet} from 'react-native'
const styles = StyleSheet.create({
        container: {
            flex: 1,
            alignItems:'center',
            backgroundColor: 'white'
        },
            appNameText:{
            color: 'black',
            padding: 10,
            margin: 15,
            fontSize: 40
        },
        appLogo: {
            marginTop: '50%',
            height: 200,
            width: 200,
            alignItems: 'center',
        },
        settingsMain:{
            marginTop: 20,
            width: '90%',
            height: '55%',
            flexDirection: 'column',
        },
        slider:{
            width: '100%',
            margin:7
        },
        sliderText:{
            flexDirection: 'row',
            justifyContent: 'space-around'
        },
        map: {
            ...StyleSheet.absoluteFillObject
        },
        polylineContent:{
            ...StyleSheet.absoluteFillObject,
            margin:10,
            height: 70,

            backgroundColor: '#FFFFFF93',
            borderRadius: 10,
        },
        polyLineText:{
            flexDirection: 'row',
            justifyContent: 'space-around',
            width:'100%'
        },
        datetime:{
            padding: 6,
            width: '100%',
            height: '7%',
            flexDirection: 'row',
            justifyContent: 'space-around',
            backgroundColor: 'white',
            alignItems: 'center',
            borderBottomWidth: 1,
            borderBottomColor: '#CFD8DC'
        },
        drivingEvents:{
            height: '100%',
            width: '100%',
        },
        eventInfoText: {
            color: '#616161',
            fontSize:12,
            marginRight: 8
        },
        eventInfoContainer:{
            width: '70%',
            alignItems:'flex-end',
            marginTop: 10,
            paddingRight: 10
        },
        eventTextContainer: {
            width: '30%',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            paddingLeft: 10
        },
        eventNameText: {
            color: '#616161',
            fontSize:20,
        },
        barContainer: {
            flex:1,
            marginTop:10,
            marginBottom:'1%',
            justifyContent: 'space-between'
        },
        mainBarContainer:{
            alignItems:'center',
            flexDirection: 'column',
            justifyContent:'center'
        },
        linearBarContainer : {
            marginTop:10,
            flexDirection: 'row',
        },
        progressBar : {
            width:'50%',
            alignItems:'center'
        },
        Button: {
            backgroundColor: '#00897B',
            padding: 10,
            margin:8,
            alignItems: 'center'
        },
        ButtonText:{
            color: 'white'
        },
        icon:{
            height: 30,
            width:30,
            color:'white',
            fontSize: 16
        },
        mapLegend: {
            width:'100%',
            paddingBottom: 10,
            flexWrap: 'wrap',
            backgroundColor: 'white',
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center'
        },
        partitionLine:{
            borderRightColor:"#ECEFF1",
            borderWidth:0.5,
            height:'100%'}
            });
export {styles}
