import React from 'react';
import ReactDOM from 'react-dom';

import '@patternfly/patternfly/patternfly.css'; //have to use this import to customize scss-variables.scss
//import "@patternfly/react-core/dist/styles/base.css";

import { Provider } from 'react-redux'
import { Route, Switch } from 'react-router'
import { ConnectedRouter } from 'connected-react-router'

import { Helmet } from "react-helmet";
import { 
    Page, 
} from '@patternfly/react-core';  


import './index.css';

import Header from './components/Header';

//import App from './App';
import configureStore, { history } from './redux/configureStore';


import Summary from './pages/Summary';
import Phase from './pages/Phase';

const data = window.__DATA__;
delete window.__DATA__;

console.log("data",data)

const store = configureStore(data)
const logoProps = {
    href: '/',
    onClick: (e) => {
      history.push('/')
      e.preventDefault()
    },
    //target: '_blank'
  };

  //
ReactDOM.render(
    <Provider store={store}>
        <ConnectedRouter history={history}>
            <Page header={(<Header logoProps={logoProps} />)}>
                <Helmet>
                    <title>HF:report</title>
                </Helmet>
            <Switch>
                <Route exact path="/" render={
                    ({match})=>{
                        return (<Summary/>)
                    }
                } />
                <Route path="/phase/:phaseId" render={
                    ({match})=>{
                        return (<Phase/>)
                    }
                } />
            </Switch>
            </Page>
        </ConnectedRouter>
    </Provider>
, document.getElementById('root'));
