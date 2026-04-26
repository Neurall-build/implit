// Test file with hallucinated imports

// Real packages
import React from 'react';
import { useState } from 'react';
import chalk from 'chalk';

// Node built-ins (should pass)
import fs from 'fs';
import path from 'path';
import http from 'http';

// Fake packages (should fail)
import { fetchUserData } from 'awesome-super-api';
import { login } from 'magic-auth-lib';
import { sendEmail } from '@fake/email-sender';

// Local imports
import { helper } from './utils/helper';
import { config } from './config';
import { nonexistent } from './does-not-exist';

// Real scoped package
import { Command } from '@commander-js/extra-typings';