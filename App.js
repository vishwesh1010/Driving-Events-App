import React from 'react';

import { StackNavigator } from 'react-navigation';
import Start from './Start'
import DashBoard from './DashBoard';
import DrivingMap from './DrivingMap';
import DrivingEvents from './DrivingEvents';
import Settings from './Settings';
import Api from './Api';

const App = StackNavigator({
    Start:{screen:Start},
    DrivingMap: { screen:DrivingMap},
    DrivingEvents:{screen:DrivingEvents},
    Settings:{screen:Settings},
    DashBoard:{ screen:DashBoard},
    Api:{screen:Api}

})

export default App;
