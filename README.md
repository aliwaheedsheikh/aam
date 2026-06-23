
  # VenueOps ERP

  This is a code bundle for VenueOps ERP. The original project is available at https://www.figma.com/design/AZaBcw7GuXjkmV1I11iIVJ/VenueOps-ERP.

  ## Running the code

  Run `npm i` to install the dependencies.

  Run `.\start-venueops-lan.ps1` to build the optimized frontend and serve it on `0.0.0.0:4173`. Use `http://127.0.0.1:4173` on this PC, or `http://<this-pc-lan-ip>:4173` from another device on the same LAN. Use `npm run dev` only when actively editing frontend code.

  The LAN and local testing modes use the same frontend port (`4173`) so testers are not entering data into a separate ERP instance.
  
