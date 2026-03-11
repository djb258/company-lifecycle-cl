#!/usr/bin/env node
/**
 * Bulk-update discovered domains into cl.company_candidate.
 * Sets company_domain in raw_payload and resets verification_status to PENDING.
 */

const { Pool } = require('pg');

const pool = new Pool({
  connectionString:
    'postgresql://Marketing%20DB_owner:npg_OsE4Z2oPCpiT@ep-ancient-waterfall-a42vy0du-pooler.us-east-1.aws.neon.tech:5432/Marketing%20DB?sslmode=require',
  ssl: { rejectUnauthorized: false },
});

// Discovered domains: EIN -> domain
const DISCOVERED = {
  // Batch 1 (top 10)
  '510473500': 'mcleodhealth.org',         // McLeod Health
  // '560738561': null,                     // Nash Johnson — no website found
  '571128614': 'canfor.com',               // Canfor Southern Pine
  '020598440': 'tidelandshealth.org',      // Georgetown Hospital / Tidelands Health
  '562384240': 'primaryhealthchoice.org',  // Primary Health Choice
  '570314381': 'conwaymedicalcenter.com',  // Conway Medical Center
  '570950303': 'carlyleflorence.com',      // Carlyle Senior Care
  '473024061': 'foundersgroupinternational.com', // Founders National Golf
  '560797402': 'atlanticpkg.com',          // Atlantic Corporation
  '570828077': 'blackstire.com',           // Black's Tire Service

  // Batch 2 (11-20)
  '570851898': 'palmettocorp.com',         // Palmetto Corp
  '582319320': 'strandhospitality.com',    // Strand Development
  '570363473': 'mccallfarms.com',          // McCall Farms
  '560388031': 'sboil.com',               // Sampson-Bladen Oil
  '570337423': 'htcinc.net',              // Horry Telephone Cooperative
  '465019366': 'surteconorthamerica.com',  // Surteco North America
  '566093446': 'coastalenterprisesinc.org', // Coastal Enterprises
  '208927856': 'brittainresorts.com',      // Brittain Resorts
  '571085343': 'palmettoinfusion.com',     // Palmetto Infusion
  '560749642': 'terminix.com',            // Terminix NC

  // Batch 3 (21-30)
  '454607633': 'sixaxisllc.com',           // SixAxis
  '570115230': 'abbank.com',              // Anderson Brothers Bank
  // '561080800': null,                     // McAndersons (McDonald's franchise) — no website
  '570672117': 'lrmcenter.com',            // Little River Medical Center
  '566070824': 'wagesnc.org',              // Wayne Action Group
  '822962394': 'orthosc.org',              // OrthoSC
  // '570701879': null,                     // Precision Southeast — no website
  '560815638': 'scapnc.org',              // Southeastern Community Action
  '260071475': 'bestdiamondpkg.com',       // Best Diamond Packaging

  // Batch 5 (remaining top failed after filters)
  '020598400': 'tidelandshealth.org',      // Georgetown Hospital System (same entity as Tidelands)
  '562260024': 'megaforce.com',            // Mega Force Staffing Group
  '043017831': 'agruamerica.com',          // Agru America
  '570527712': 'oceanlakesservicecorp.com', // Ocean Lakes Service Corp
  '830570534': '810bowling.com',           // 810 Management LLC (810 Entertainment)
  '743166304': 'seasidevacations.com',     // Seaside Inn Rentals
  '561902314': 'hbc-inc.com',             // Horne Bros. Construction
  '570768835': 'heraldoffice.com',         // Herald Office Supply
  '814563410': 'divinedininggroup.com',    // Divine Dining Group
  '570146256': 'conwaynationalbank.com',   // Conway National Bank

  // Batch 6 (14-25 in remaining queue)
  '263552985': 'pret-usa.com',            // Wellman Plastics Recycling (now Pret)
  '200063146': 'kidzcare.com',            // KidzCare Pediatrics
  '570707042': 'meltonelectric.com',      // Melton Electric
  '570131550': 'burroughschapin.com',     // Burroughs & Chapin
  '570963173': 'carolina-health.com',     // Strand Physician Specialists
  '463212981': 'lbsllc.net',             // Legacy Business Solutions
  '800694610': 'monsterrg.com',           // Monster Reservations Group
  '270062586': 'metglas.com',             // Metglas Inc
  '571030410': 'mcdonaldsmyrtlebeach.com', // J&L Services (McDonald's franchise)
  '570721991': 'aohardee-son.com',        // A.O. Hardee & Son

  // Batch 7 (24-33 in remaining queue)
  '570828161': 'debordieuclub.com',       // DeBordieu Club
  '571090832': 'yahnis.com',              // The Yahnis Company
  '561792988': 'hiacode.com',             // Health Information Associates
  '134281018': 'oakwells.com',            // Oakwells Commuter Rail
  '843104625': 'worldinsurance.com',      // World Payroll & HR (now World Insurance)
  '412071687': 'wirthwein.de',            // Wirthwein New Bern Corp
  '570746016': 'rhmoorecompany.com',      // R H Moore Company
  '510228853': '3vsigmausa.com',          // 3V Sigma USA
  '571071261': 'theapexautomotivegroup.com', // Apex Automotive Group (East Coast Honda)
  '261366826': 'southatlantic.bank',      // South Atlantic Bank

  // Batch 8 (34-43 in remaining queue)
  '593690173': 'tidelands.net',           // Higginbotham Automobiles (Tidelands Ford)
  '570380356': 'brookgreen.org',          // Brookgreen Gardens
  '570679807': 'hcpsc.org',              // Health Care Partners of SC
  '371205514': 'parkslivestock.com',      // L.L. Parks Livestock
  '570365841': 'caycecompany.com',        // Cayce Company
  '261547833': 'dmaindustries.com',       // DMA Holdings
  '570736291': 'sparkstoyota.com',        // Rick Sparks Enterprise
  '621830736': 'laudisi.com',             // Laudisi Enterprises
  '463010769': 'onehourmagic.com',        // Carolina Home Service Group

  // Batch 9 (44-50+ in remaining queue)
  '571093849': 'brandon.agency',          // Brandon Advertising
  '571073593': 'envirosep.com',           // Tilley Technologies (dba Envirosep)
  '570427372': 'cilumber.com',            // Charles Ingram Lumber
  '570782942': 'heraldoffice.com',        // Herald Office Supply Inc (2nd entity)
  '994544690': 'cacoatings.com',          // INX International Coatings
  '470896915': 'boflavor.com',            // Bo Benton Inc (Bojangles franchisee)
  '581387871': 'boysandgirlshomes.org',   // Boys and Girls Homes of NC
  // '260354572': null,                     // Greylock Capital — no website found

  // Batch 12
  // '570709411': null,                     // Sea Island Enterprises — no website found
  '571049926': 'myrtlebeachchryslerjeep.net', // Myrtle Beach Chrysler Jeep
  // '010696270': null,                     // Logistical Customer Service — no website
  // '570777346': null,                     // Associated Medical Specialists — no website
  '202746267': 'kalestruckheavyequipment.com', // Kales Truck & Heavy Equipment
  '205794499': 'lottsacheese.com',         // Lottsa Cheese (2nd EIN)
  '570826584': 'hadwin-white.com',         // Hadwin White dealership
  '593545882': 'bigmcasino.com',           // Big M Casino
  '560796749': 'nfcmoney.com',            // National Finance Company
  '453263274': 'kingcsinc.com',            // King Construction Services
  '570295747': 'thedunesclub.com',         // Dunes Golf and Beach Club

  // Batch 13
  '010656674': 'bsrinc.org',              // Brunswick Senior Resources
  '204311152': 'wdps.net',               // WD LLC (Waccamaw Dermatology)
  '560936909': 'carobell.org',            // Carobell Inc
  '571110464': 'canalwood.com',           // Canal Wood LLC
  '570936656': 'derricklawfirm.com',      // Derrick Law Firm
  '852575810': 'exploreindustries.com',    // Explore Industries
  // '844301189': null,                     // Harnish Group — no website
  // '851112374': null,                     // MrDrummond — no website
  // '223847854': null,                     // K9 Cuisine — no website
  // '472169780': null,                     // McGreat (Great Clips franchise) — no dedicated website

  // Batch 14
  '201268535': 'libertysteelgroup.com',    // Liberty Steel Georgetown
  '570699766': 'mycoastalnissan.com',     // Coastal Nissan
  '561171417': 'nationaldodge.com',       // National Automotive Group
  '461257178': 'teknoware.com',           // Teknoware Inc
  '263659887': 'monarchroofing.biz',      // Monarch Company (roofing)
  '570728109': 'lakewoodcampground.com',  // Lakewood Camping Resort
  '470979252': 'icerecycling.com',        // ICE Recycling
  '270594340': 'advancedrecruitingpartners.com', // Advanced Recruiting Partners
  '570606128': 'ai-restoration.com',      // A&I Corporation
  '561785940': 'landfall.org',            // Landfall Council of Associations

  // Batch 10
  '570669193': 'mccallsinc.com',          // McCall's Inc (HVAC supply)
  '831075760': 'resortmcgroup.com',       // Resort MC Group
  '800291968': 'myccnb.com',             // Coastal Carolina National Bank
  '222455232': 'ebtron.com',              // EBTRON Inc
  '842749315': 'elitequartz.com',         // Elite Quartz Mfg
  '570972940': 'lottsacheese.com',        // Lottsa Cheese (Papa Johns franchise)
  '560483102': 'bryanhondafayetteville.com', // Bryan Pontiac-Cadillac
  '570776381': 'websterrogers.com',       // WebsterRogers LLP
  '570812858': 'grandpalmsresortmb.com',  // Plantation Resort (now Grand Palms)
  '621684004': 'logansinthecarolinas.com', // CMAC Inc (Logan's Roadhouse)

  // Batch 11
  '201448542': 'omnicarolinas.com',       // Omni Services of SC
  '922743717': 'tccocivil.com',           // Thomson, Corder & Company (civil contractor)
  '453588941': 'ptr-us.com',             // PTR Industries (firearms)
  '560857923': 'greenelamp.org',          // Greene Lamp Community Action

  // Batch 12
  // '570709411': null,                     // Sea Island Enterprises — no website found
  '571049926': 'myrtlebeachchryslerjeep.net', // Myrtle Beach Chrysler Jeep
  // '010696270': null,                     // Logistical Customer Service — no website
  // '570777346': null,                     // Associated Medical Specialists — no website
  '202746267': 'kalestruckheavyequipment.com', // Kales Truck & Heavy Equipment
  '205794499': 'lottsacheese.com',         // Lottsa Cheese (2nd EIN)
  '570826584': 'hadwin-white.com',         // Hadwin White dealership
  '593545882': 'bigmcasino.com',           // Big M Casino
  '560796749': 'nfcmoney.com',            // National Finance Company
  '453263274': 'kingcsinc.com',            // King Construction Services
  '570295747': 'thedunesclub.com',         // Dunes Golf and Beach Club

  // Batch 13
  '010656674': 'bsrinc.org',              // Brunswick Senior Resources
  '204311152': 'wdps.net',               // WD LLC (Waccamaw Dermatology)
  '560936909': 'carobell.org',            // Carobell Inc
  '571110464': 'canalwood.com',           // Canal Wood LLC
  '570936656': 'derricklawfirm.com',      // Derrick Law Firm
  '852575810': 'exploreindustries.com',    // Explore Industries
  // '844301189': null,                     // Harnish Group — no website
  // '851112374': null,                     // MrDrummond — no website
  // '223847854': null,                     // K9 Cuisine — no website
  // '472169780': null,                     // McGreat (Great Clips franchise) — no dedicated website

  // Batch 14
  '201268535': 'libertysteelgroup.com',    // Liberty Steel Georgetown
  '570699766': 'mycoastalnissan.com',     // Coastal Nissan
  '561171417': 'nationaldodge.com',       // National Automotive Group
  '461257178': 'teknoware.com',           // Teknoware Inc
  '263659887': 'monarchroofing.biz',      // Monarch Company (roofing)
  '570728109': 'lakewoodcampground.com',  // Lakewood Camping Resort
  '470979252': 'icerecycling.com',        // ICE Recycling
  '270594340': 'advancedrecruitingpartners.com', // Advanced Recruiting Partners
  '570606128': 'ai-restoration.com',      // A&I Corporation
  '561785940': 'landfall.org',            // Landfall Council of Associations

  // Batch 15
  '200462802': 'bestdaypsych.com',        // Best Day Psychiatry
  '900431587': 'coastalasphalt.com',      // Coastal Asphalt
  '570537981': 'bellamylaw.com',          // Bellamy Rutenberg Copeland
  '570636724': 'coastaleyegroup.com',     // Coastal Eye Group
  '270583388': 'carolinaenergyconservation.com', // Carolina Energy Conservation
  // '812758549': null,                     // Cash Hospitality Group — no website found
  '570528030': 'strandgi.com',            // Strand GI Associates
  '571089234': 'dnlsitework.com',         // D&L Sitework
  '570373011': 'spannroofing.com',        // Spann Roofing
  '571049603': 'carolinaradiology.com',   // Carolina Radiology Associates

  // Batch 16
  '510437679': 'creativebeginningscdc.com', // Creative Beginnings Child Development
  '455088790': 'starcom.net',             // Star Telephone Membership Corporation
  // '920385053': null,                     // Munn Express Delivery — no website
  '832875260': 'arrisbuilt.com',          // Arris Holdings LLC
  '570214572': 'myrtlebeachareachamber.com', // Myrtle Beach Area Chamber of Commerce
  '814449681': 'hopenfreedom.com',        // Hope and Freedom Home Care
  '260339110': 'safe-harbor.com',         // Safe Harbor Access Systems
  '582383482': 'gilmoreentertainment.info', // Gilmore Entertainment Group
  // '570823963': null,                     // Inlet Creek Properties — no website
  '561316375': 'petersontoyota.com',      // Peterson Automotive

  // Batch 17
  // '205809124': null,                     // Heritage Hauling — no website
  '571095339': 'homeinstead.com',         // Home Instead of Charleston (franchise)
  '560626576': 'lejeunemotorsports.com',  // Lejeune Motor Company
  '570939339': 'bellandbell.com',         // Bell and Bell Automotive
  '570470609': 'clbenton.com',            // C.L. Benton & Sons
  '331029740': 'pjstruckbodies.com',      // PJ's Truck Bodies & Equipment
  '830421712': 'echousing.org',           // Eastern Carolina Homelessness Org (ECHO)
  '873629585': 'bakeramericancycles.com', // Baker Holdings Group
  '460797165': 'chrismanningcommunities.com', // Chris Manning Communities
  '570783896': 'grandstrandpediatrics.com', // Grand Strand Pediatrics

  // Batch 18
  '571019584': 'coopermechanicalservices.com', // Cooper Mechanical Services
  '462046659': 'tidelandshealth.org',     // Tidelands/GHS Joint Venture
  '561214119': 'swhs-nc.org',             // Stedman-Wade Health Services
  // '461467867': null,                     // KA Harnish — no website
  // '201819628': null,                     // Dollar and More — no website
  '461049340': 'stotlerhayes.com',        // Stotler Hayes Group
  '571109284': 'cagaero.com',             // Consortia Aerospace Group
  '263938210': 'ccsnc.net',               // Coastal Carolina Neonatology
  // '843617304': null,                     // CWC LLC — no website
  // '570403411': null,                     // Stuckey Brothers Parts — no website

  // Batch 19
  '201506533': 'billysplumbingcompany.com', // Billy's Plumbing Company
  '814350810': 'heidiscornersc.com',      // Heidi's Corner Restaurant Group
  // '570957839': null,                     // Southern Asphalt — acquired, no standalone site
  '813521842': 'ncspecialpolice.org',      // NC Special Police
  '854099761': 'remnantmgt.com',           // Remnant Management
  '570919715': 'msahealthcare.com',        // MSA of Myrtle Beach
  '570674754': 'coastalwire.com',          // Coastal Wire Company
  '465729112': 'vineswaterexperts.com',    // Vines Plumbing

  // Batch 20
  '475419175': 'offthehookyachts.com',    // Off The Hook Yacht Sales
  '465473936': 'bluesentryit.com',        // Blue Sentry Inc
  '061683192': 'xtreme-wireless.com',     // Xtreme Wireless of NC
  '473743124': 'theclawhouse.com',        // DJ2 LLC (The Claw House)
  '570446451': 'palmettochevy.com',       // Palmetto Chevrolet
  '880741517': 'murraylawofficespa.com',  // Murray Law Group
  '561132243': 'bethesdahealthcarefacility.net', // Bethesda Healthcare
  '560582024': 'falconchildrenshome.org', // Falcon Children's Home
  '454170580': 'pizzettaspizzanc.com',    // Pizzettas II
  '010812059': 'pigglywigglystores.com',  // Trent Foods (Piggly Wiggly)

  // Batch 21
  '570786606': 'easterncarolinapeds.com', // Eastern Carolina Pediatric Associates
  '571018994': 'goldfinchfuneralhome.com', // Goldfinch Funeral Services
  '571074853': 'grahamgolfcars.com',      // Graham Golf Cars
  '813340536': 'casagomyrtlebeach.com',   // Larrowe Property Management (now Casago)
  '820678853': 'signaturewealth.com',     // Signature Wealth Group
  '571115453': 'icoastalnet.com',         // Intercoastal Net Designs
  '871230063': 'sevendaysinhomecare.org',  // Seven Days In-Home Care Agency
  '020649671': 'heavenlyhavencdc.com',    // Heavenly Haven Child Development
  // '843597193': null,                     // Cobalt Management — no website
  '561658826': 'cdbcorp.net',            // CDB Corporation

  // Batch 22
  '322643865': 'crossroadshospitalitygroup.com', // Crossroads on Main
  '571056397': 'southeasternlandco.com',  // Southeastern Land Company
  '560790234': 'g-msales.com',           // G & M Sales of Eastern NC
  '570709940': 'thomasrealestate.com',    // Thomas Real Estate
  '570884360': 'docusystemsinc.com',      // DocuSystems
  '463918314': 'pm-llc.com',             // Ponderosa Management
  '452634398': 'scpainandspine.com',      // SC Pain & Spine Specialists
  '570808975': 'getlanes.net',           // Lane's Professional Pest Elimination
  '341974854': 'carolinaurologicresearchcenter.com', // Carolina Urologic Research
  '570724816': 'blantonsupplies.com',     // Blanton Supplies

  // Batch 23
  '570992733': 'careteamplus.org',        // CareTeam Plus
  // '570852502': null,                     // Phillips and Associates — unclear match
  '263660631': 'creativemindspreschool.net', // Creative Minds Preschool
  '570788453': 'dillonmedicine.com',      // Dillon Internal Medicine
  '260306187': 'originalbenjamins.com',   // CFI (Benjamin's Seafood)
  '570802387': 'myrtlebeachtravelpark.com', // Myrtle Beach Travel Park
  '461450018': 'aslservicesmb.com',       // ASL Sign Services
  // '273256462': null,                     // Coastal Auto Partners — no website
  '570521684': 'dunes.com',              // Dunes Realty of Garden City
  '582473379': 'gsderm.com',             // Grand Strand Dermatology

  // Batch 24
  // '562096233': null,                     // Goldsboro Emergency Medical — no website
  // '932363037': null,                     // Fountain6 Investment — no website
  '203773626': 'adamarketinginc.com',    // ADA Marketing Inc
  '200465327': 'darganconstruction.com', // Dargan Management (Dargan Construction)
  '562120163': 'biminisoysterbar.com',   // R&S Bimini's Oyster Bar
  '274982833': 'g3engineering.org',      // G3 Engineering
  // '571004111': null,                     // Carolina OBGYN — affiliated with Tidelands, no standalone
  '562142465': 'magnoliaobgyn.com',      // Magnolia OB/GYN of Myrtle Beach
  '562019166': 'smeincusa.com',          // SME Inc USA
  '820608337': 'bennysbigtime.com',      // Benny's Big Time Pizzeria

  // Batch 25
  '570925251': 'beachos.com',            // Coastal Carolina Oral & Maxillofacial Surgery
  '262741050': 'southeasterncable.com',  // Southeastern Cable Contractors
  '570707312': 'naccdb.com',            // North American Construction Company
  '621799370': 'parkwaysurgerycenter.com', // Parkway Surgery Center
  // '881193125': null,                     // HGA Hospitality — no website
  // '570421238': null,                     // T & M Transfer Company — no website
  '582642745': 'willowtreervr.com',      // Buck Creek RVR (Willow Tree RV Resort)
  '262852208': 'carbonconversions.com',  // Carbon Conversions Inc
  // '260530128': null,                     // Certified Heating and Air — no website
  '134241163': 'carolinabone.com',       // Carolina Bone & Joint Surgery

  // Batch 26
  '271801954': 'wholesaleboutique.com',  // Wholesale Boutique LLC
  // '832483650': null,                     // Tri Solutions Inc — unclear match
  '570858679': 'pawleysislandrealty.com', // Pawleys Island Realty Co
  // '261560916': null,                     // Strother Ventures II (ERA franchise) — no standalone site
  // '842417912': null,                     // RMD Enterprises (SERVPRO franchise) — no standalone site
  '452151078': 'coastalairplus.com',     // Coastal Air & Refrigeration
  // '200882147': null,                     // HBH Land Group (US Lawns franchise) — no standalone site
  '570522204': 'thomassupply.com',       // Thomas Supply Company
  '570922776': 'allymgt.com',            // Ally Management Inc
  '561719839': 'earney.com',             // Earney and Company LLP

  // Batch 27
  '570953411': 'pierceinc.com',          // Pierce Machinery & Wire Inc
  '474712207': 'physiosc.com',           // Pro-Motion Physical Therapy
  '570626262': 'dpiroto.com',            // Diversified Plastics Inc
  '570795217': 'systemstechnologyinc.com', // Systems Technology Inc
  '570801130': 'sccpa.com',              // Smith Sapp Professional Association
  '561853226': 'tmxship.com',            // TMX World Shipping Company
  '834571234': 'oceaniccounseling.com',  // Oceanic Counseling Group
  // '471934967': null,                     // Killian & Addy — no website
  // '560514877': null,                     // Yam City Oil & Gas — no website
  '800543335': 'sauinsurance.com',       // Southeastern Alliance Underwriters

  // Batch 28
  '571112419': 'tommyswholesaleflorist.com', // Tommy's Wholesale Florist
  '204187967': 'waccamawcooling.com',    // Waccamaw Heating & Cooling
  '582415640': 'earthworksgroup.com',    // The Earthworks Group
  // '474481142': null,                     // One Team LLC — no website
  '570382497': 'peoplesunderwriters.com', // Peoples Underwriters Inc
  // '813160048': null,                     // Second Lap Inc (Fleet Feet franchise) — no standalone site
  '300943656': 'angelpetsofpawleys.com', // Angel Pets
  '834226878': 'developmentresourcegroup.com', // Development Resource Group
  // '862213488': null,                     // MWP Restaurants — no website
  // '020642171': null,                     // Georgetown Internists — affiliated with Tidelands Health
};

(async () => {
  let updated = 0;
  let errors = 0;

  for (const [ein, domain] of Object.entries(DISCOVERED)) {
    try {
      const result = await pool.query(`
        UPDATE cl.company_candidate
        SET
          raw_payload = jsonb_set(
            jsonb_set(raw_payload, '{company_domain}', $1::jsonb),
            '{known_domain}', $1::jsonb
          ),
          verification_status = 'PENDING',
          verification_error = NULL,
          verified_at = NULL
        WHERE source_system = 'HUNTER_DOL_SS003'
          AND raw_payload->>'ein' = $2
          AND verification_status = 'FAILED'
        RETURNING candidate_id, raw_payload->>'company_name' AS company_name
      `, [JSON.stringify(domain), ein]);

      if (result.rows.length > 0) {
        console.log(`Updated: ${result.rows[0].company_name} -> ${domain}`);
        updated++;
      } else {
        console.log(`No match for EIN ${ein}`);
      }
    } catch (err) {
      console.error(`Error updating EIN ${ein}: ${err.message}`);
      errors++;
    }
  }

  console.log(`\nDone. Updated: ${updated}, Errors: ${errors}`);
  await pool.end();
})();
