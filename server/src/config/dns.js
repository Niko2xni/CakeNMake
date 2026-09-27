const dns = require('dns');

function configureDns() {
  try {
    dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1', '1.0.0.1']);
  } catch (error) {
    console.warn('Could not set custom DNS servers:', error.message);
  }
}

module.exports = configureDns;
