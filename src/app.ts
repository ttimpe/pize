import { Stop } from './models/Stop';
import { Trip } from './models/Trip';
import { sequelize } from './sequelize';

import { Agency } from './models/Agency';
import { Route } from './models/Route';

async function listRoutesByAgency(agencyName: string) {
  try {
    const agency = await Agency.findOne({
      where: {
        agency_name: agencyName,
      },
      include: {
        model: Route,
        as: 'routes', // This assumes you've defined an association between Agency and Route
      },
    });

    if (!agency) {
      console.log(`Agency ${agencyName} not found.`);
      return;
    }

    console.log(`Routes operated by ${agency.agency_name}:`);
    agency['routes'].forEach((route) => {
      console.log(`Route ID: ${route.route_id}, Name: ${route.route_short_name}`);
    });
  } catch (error) {
    console.error('Error listing routes by agency:', error);
  }
}

listRoutesByAgency('moBiel'); // Replace with the actual agency name