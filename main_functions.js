
function get_am_or_pm(hour){
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


export {get_am_or_pm}
