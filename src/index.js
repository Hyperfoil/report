import React from 'react';
import ReactDOM from 'react-dom';

import '@patternfly/patternfly/patternfly.css'; //have to use this import to customize scss-variables.scss
//import "@patternfly/react-core/dist/styles/base.css";

import { Provider } from 'react-redux'
import { Route, Switch } from 'react-router'
import CacheRoute, { CacheSwitch } from 'react-router-cache-route'

import { ConnectedRouter } from 'connected-react-router'

import { Helmet } from "react-helmet";
import { 
    Page, 
} from '@patternfly/react-core';  


import './index.css';


import Layout from './components/Layout';

import Summary from './pages/Summary';
import Details from './pages/Details';
import Phase from './pages/Phase';
import Failures from './pages/Failures';
import Cpu from './pages/Cpu';
import Comparison from './pages/Comparison'

import store, {history} from './redux/store';





  //
ReactDOM.render(
    <Provider store={store}>
        <ConnectedRouter history={history}>
            <Layout>
                {/* <Helmet>
                    <title>HF:report</title>
                </Helmet> */}
            <CacheSwitch>
                <CacheRoute exact path="/" component={Summary} />
                <CacheRoute exact path="/details" component={Details} />
                <Route path="/phase/:phaseId*" render={
                    ({match})=>{
                        return (<Phase/>)
                    }
                } />
                <Route path="/failures" component={Failures} />
                <Route path="/cpu" component={Cpu} />
                <Route path="/comparison" component={Comparison} />
            </CacheSwitch>
            </Layout>
        </ConnectedRouter>
    </Provider>
, document.getElementById('root'));
