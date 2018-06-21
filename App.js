import React from 'react';

import { StackNavigator } from 'react-navigation';
import Start from './Start'
import Bar from './Bar';
import Location from './Location';
import DrivingEvents from './DrivingEvents';
import Settings from './Settings';
import Api from './Api';

const App = StackNavigator({
    Start:{screen:Start},
    Location: { screen:Location},
    DrivingEvents:{screen:DrivingEvents},
    Settings:{screen:Settings},
    Bar: { screen:Bar },
    Api:{screen:Api}

})

export default App;
