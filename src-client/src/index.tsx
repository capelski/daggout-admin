import React from 'react';
import ReactDOM from 'react-dom';
import { App } from './components/app';

import './style/main.scss';

const appPlaceholder = document.getElementById('app-placeholder');
ReactDOM.render(<App />, appPlaceholder);
