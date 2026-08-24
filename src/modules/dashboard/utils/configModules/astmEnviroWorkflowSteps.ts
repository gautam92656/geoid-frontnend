import type { WorkflowStep } from "./types";

/** Workflow steps from production API workflow id 7579. */
export const ASTM_ENVIRO_WORKFLOW_NAME = "ASTM - Enviro - Geotech Consultants Inc 2024-11-29 03:54:16";

export const ASTM_ENVIRO_WORKFLOW_STEPS: WorkflowStep[] = [
  {
    "id": "384423",
    "name": "Depth",
    "fieldName": "Depth",
    "type": "element",
    "inputType": "number",
    "databaseField": "depth",
    "required": true,
    "unit": "ft"
  },
  {
    "id": "384464",
    "name": "As above",
    "fieldName": "As above",
    "type": "element",
    "inputType": "checkbox",
    "databaseField": "asabove",
    "required": false,
    "unit": "m"
  },
  {
    "id": "384424",
    "name": "Origin",
    "fieldName": "Origin",
    "type": "element",
    "inputType": "options",
    "databaseField": "origin",
    "required": true,
    "optionSet": "origin",
    "options": [
      {
        "id": "19397",
        "name": "Topsoil",
        "value": "Topsoil",
        "visible": true,
        "group": "Soil"
      },
      {
        "id": "19398",
        "name": "Fill",
        "value": "Fill",
        "visible": true,
        "group": "Soil"
      },
      {
        "id": "19399",
        "name": "Natural",
        "value": "Natural",
        "visible": true,
        "group": "Soil"
      },
      {
        "id": "19400",
        "name": "Dune",
        "value": "Dune",
        "visible": true,
        "group": "Soil"
      },
      {
        "id": "19401",
        "name": "Controlled FILL",
        "value": "Controlled FILL",
        "visible": true,
        "group": "Soil"
      },
      {
        "id": "19402",
        "name": "Aeolian",
        "value": "Aeolian",
        "visible": true,
        "group": "Soil"
      },
      {
        "id": "19403",
        "name": "Residual",
        "value": "Residual",
        "visible": true,
        "group": "Soil"
      },
      {
        "id": "19404",
        "name": "Weathered Material",
        "value": "Weathered Material",
        "visible": true,
        "group": "Rock"
      },
      {
        "id": "19405",
        "name": "Deutgam Silt",
        "value": "Deutgam Silt",
        "visible": true,
        "group": "Soil"
      },
      {
        "id": "19406",
        "name": "Granodiorite",
        "value": "Granodiorite",
        "visible": true,
        "group": "Rock"
      },
      {
        "id": "19407",
        "name": "Swamp",
        "value": "Swamp",
        "visible": true,
        "group": "Soil"
      },
      {
        "id": "19408",
        "name": "CORELOSS",
        "value": "CORELOSS",
        "visible": true,
        "group": "Soil"
      },
      {
        "id": "19409",
        "name": "Coastal Lagoon",
        "value": "Coastal Lagoon",
        "visible": true,
        "group": "Soil"
      },
      {
        "id": "19410",
        "name": "Alluvial",
        "value": "Alluvial",
        "visible": true,
        "group": "Soil"
      },
      {
        "id": "19411",
        "name": "Rock",
        "value": "Rock",
        "visible": true,
        "group": "Rock"
      },
      {
        "id": "19412",
        "name": "Pavement",
        "value": "Pavement",
        "visible": true,
        "group": "Non-Soil"
      },
      {
        "id": "19413",
        "name": "Colluvium",
        "value": "Colluvium",
        "visible": true,
        "group": "Soil"
      },
      {
        "id": "19414",
        "name": "Alluvium",
        "value": "Alluvium",
        "visible": true,
        "group": "Soil"
      },
      {
        "id": "19415",
        "name": "Fluvial",
        "value": "Fluvial",
        "visible": true,
        "group": "Soil"
      },
      {
        "id": "19752",
        "name": "Garden stone layer with sand",
        "value": "Garden stone layer with sand",
        "visible": true,
        "group": "Non-Soil"
      },
      {
        "id": "23245",
        "name": "Non-soil",
        "value": "Non-soil",
        "visible": true,
        "group": "Non-Soil"
      },
      {
        "id": "24120",
        "name": "Interbedded Layers of clayey SAND/sandy CLAY",
        "value": "Interbedded Layers of clayey SAND/sandy CLAY",
        "visible": true,
        "group": "Soil"
      }
    ],
    "conditions": [
      {
        "type": "disable",
        "field": "As above",
        "value": true,
        "searchTerm": "As above"
      }
    ]
  },
  {
    "id": "384426",
    "name": "Non-Soil Type",
    "fieldName": "Non-Soil Type",
    "type": "element",
    "inputType": "options",
    "databaseField": "pavement_type",
    "required": false,
    "optionSet": "non_soil_type",
    "options": [
      {
        "id": "workflow-option-1",
        "name": "Concrete",
        "value": "Concrete",
        "visible": true
      },
      {
        "id": "workflow-option-2",
        "name": "Pavers",
        "value": "Pavers",
        "visible": true
      }
    ],
    "conditions": [
      {
        "type": "show",
        "field": "Origin",
        "value": "Non-Soil"
      },
      {
        "type": "disable",
        "field": "As above",
        "value": true
      },
      {
        "type": "enable",
        "field": "As above",
        "value": false
      }
    ]
  },
  {
    "id": "384427",
    "name": "Non-Soil Note",
    "fieldName": "Non-Soil Note",
    "type": "element",
    "inputType": "note",
    "databaseField": "pavement_note",
    "required": false,
    "conditions": [
      {
        "type": "show",
        "field": "Origin Type",
        "value": "Non-Soil",
        "searchTerm": "Origin Type",
        "isOriginType": true
      }
    ]
  },
  {
    "id": "384425",
    "name": "Rock Type",
    "fieldName": "Rock Type",
    "type": "element",
    "inputType": "options",
    "databaseField": "rock_type",
    "required": false,
    "optionSet": "rock_type",
    "options": [
      {
        "id": "33153",
        "name": "Sandstone",
        "value": "Sandstone",
        "visible": true
      },
      {
        "id": "33154",
        "name": "Siltstone",
        "value": "Siltstone",
        "visible": true
      },
      {
        "id": "33155",
        "name": "Phyllite",
        "value": "Phyllite",
        "visible": true
      },
      {
        "id": "33156",
        "name": "Basalt",
        "value": "Basalt",
        "visible": true
      },
      {
        "id": "33157",
        "name": "Greywacke",
        "value": "Greywacke",
        "visible": true
      },
      {
        "id": "33158",
        "name": "Argillite",
        "value": "Argillite",
        "visible": true
      },
      {
        "id": "33159",
        "name": "Concrete",
        "value": "Concrete",
        "visible": true
      },
      {
        "id": "33160",
        "name": "Breccia",
        "value": "Breccia",
        "visible": true
      },
      {
        "id": "33161",
        "name": "Chert",
        "value": "Chert",
        "visible": true
      },
      {
        "id": "33162",
        "name": "Coal",
        "value": "Coal",
        "visible": true
      },
      {
        "id": "33163",
        "name": "Conglomerate",
        "value": "Conglomerate",
        "visible": true
      },
      {
        "id": "33164",
        "name": "Gneiss",
        "value": "Gneiss",
        "visible": true
      },
      {
        "id": "33165",
        "name": "Granite",
        "value": "Granite",
        "visible": true
      },
      {
        "id": "33166",
        "name": "Rhyolite",
        "value": "Rhyolite",
        "visible": true
      },
      {
        "id": "33167",
        "name": "Tuff",
        "value": "Tuff",
        "visible": true
      },
      {
        "id": "33168",
        "name": "Asphalt",
        "value": "Asphalt",
        "visible": true
      }
    ],
    "conditions": [
      {
        "type": "show",
        "field": "Origin",
        "value": "Rock",
        "searchTerm": "Origin Type",
        "isOriginType": true
      },
      {
        "type": "disable",
        "field": "As above",
        "value": true,
        "searchTerm": "As above"
      }
    ]
  },
  {
    "id": "384428",
    "name": "Rock Weathering Type",
    "fieldName": "Rock Weathering Type",
    "type": "element",
    "inputType": "options",
    "databaseField": "weather_type",
    "required": false,
    "options": [
      {
        "id": "workflow-option-1",
        "name": "Weathered",
        "value": "Weathered",
        "visible": true
      },
      {
        "id": "workflow-option-2",
        "name": "Alteration",
        "value": "Alteration",
        "visible": true
      }
    ],
    "conditions": [
      {
        "type": "show",
        "field": "Origin",
        "value": "Rock"
      }
    ]
  },
  {
    "id": "384429",
    "name": "Rock Weathering Classification",
    "fieldName": "Rock Weathering Classification",
    "type": "element",
    "inputType": "options",
    "databaseField": "weathering",
    "required": false,
    "options": [
      {
        "id": "workflow-option-1",
        "name": "Extremely",
        "value": "Extremely",
        "visible": true,
        "abbreviation": "XW",
        "isDefault": true
      },
      {
        "id": "workflow-option-2",
        "name": "Distinctly",
        "value": "Distinctly",
        "visible": true,
        "abbreviation": "DW"
      },
      {
        "id": "workflow-option-3",
        "name": "Highly",
        "value": "Highly",
        "visible": true,
        "abbreviation": "HW"
      },
      {
        "id": "workflow-option-4",
        "name": "Moderately",
        "value": "Moderately",
        "visible": true,
        "abbreviation": "MW"
      },
      {
        "id": "workflow-option-5",
        "name": "Slightly",
        "value": "Slightly",
        "visible": true,
        "abbreviation": "SW"
      },
      {
        "id": "workflow-option-6",
        "name": "Fresh",
        "value": "Fresh",
        "visible": true,
        "abbreviation": "F",
        "conditions": [
          {
            "type": "show",
            "field": "Rock Weathering Type",
            "value": "Weathered",
            "searchTerm": "Rock Weathering Type"
          }
        ]
      }
    ],
    "conditions": [
      {
        "type": "show",
        "field": "Rock Weathering Type",
        "value": "Weathered",
        "searchTerm": "Rock Weathering Type"
      }
    ],
    "multipleOptions": true
  },
  {
    "id": "384476",
    "name": "Rock Alteration Classification",
    "fieldName": "Alteration",
    "type": "element",
    "inputType": "options",
    "databaseField": "Alteration",
    "required": false,
    "options": [
      {
        "id": "workflow-option-1",
        "name": "Extremely",
        "value": "Extremely",
        "visible": true,
        "abbreviation": "XA"
      },
      {
        "id": "workflow-option-2",
        "name": "Highly",
        "value": "Highly",
        "visible": true,
        "abbreviation": "HA"
      },
      {
        "id": "workflow-option-3",
        "name": "Moderately",
        "value": "Moderately",
        "visible": true,
        "abbreviation": "MA"
      },
      {
        "id": "workflow-option-4",
        "name": "Slightly",
        "value": "Slightly",
        "visible": true,
        "abbreviation": "SA"
      }
    ],
    "conditions": [
      {
        "type": "show",
        "field": "Rock Weathering Type",
        "value": "Alteration",
        "searchTerm": "Rock Weathering Type"
      }
    ],
    "multipleOptions": true
  },
  {
    "id": "384436",
    "name": "Soil Type",
    "fieldName": "Soil Type",
    "type": "element",
    "inputType": "options",
    "databaseField": "soil_type",
    "required": false,
    "options": [
      {
        "id": "workflow-option-1",
        "name": "Gravel",
        "value": "Gravel",
        "visible": true
      },
      {
        "id": "workflow-option-2",
        "name": "Sand",
        "value": "Sand",
        "visible": true
      },
      {
        "id": "workflow-option-3",
        "name": "Clay",
        "value": "Clay",
        "visible": true
      },
      {
        "id": "workflow-option-4",
        "name": "Silt",
        "value": "Silt",
        "visible": true
      },
      {
        "id": "workflow-option-5",
        "name": "Peat",
        "value": "Peat",
        "visible": true
      }
    ],
    "conditions": [
      {
        "type": "show",
        "field": "Origin Type",
        "value": "Soil",
        "searchTerm": "Origin Type",
        "isOriginType": true
      },
      {
        "type": "disable",
        "field": "As above",
        "value": true,
        "searchTerm": "As above"
      },
      {
        "type": "show",
        "field": "Rock Weathering Classification",
        "value": "Extremely",
        "searchTerm": "Rock Weathering Classification"
      },
      {
        "type": "show",
        "field": "Alteration",
        "value": "Extremely",
        "searchTerm": "Rock Alteration Classification"
      }
    ]
  },
  {
    "id": "384437",
    "name": "Identifier",
    "fieldName": "Identifier",
    "type": "element",
    "inputType": "options",
    "databaseField": "identifier",
    "required": false,
    "options": [
      {
        "id": "workflow-option-1",
        "name": "Gravelly",
        "value": "Gravelly",
        "visible": true,
        "conditions": [
          {
            "type": "hide",
            "field": "Soil Type",
            "value": "Gravel",
            "searchTerm": "Soil Type"
          }
        ]
      },
      {
        "id": "workflow-option-2",
        "name": "Clayey",
        "value": "Clayey",
        "visible": true,
        "conditions": [
          {
            "type": "hide",
            "field": "Soil Type",
            "value": "Clay",
            "searchTerm": "Soil Type"
          }
        ]
      },
      {
        "id": "workflow-option-3",
        "name": "Sandy",
        "value": "Sandy",
        "visible": true,
        "conditions": [
          {
            "type": "hide",
            "field": "Soil Type",
            "value": "Sand",
            "searchTerm": "Soil Type"
          }
        ]
      },
      {
        "id": "workflow-option-4",
        "name": "Silty",
        "value": "Silty",
        "visible": true,
        "conditions": [
          {
            "type": "hide",
            "field": "Soil Type",
            "value": "Silt",
            "searchTerm": "Soil Type"
          }
        ]
      }
    ],
    "conditions": [
      {
        "type": "show",
        "field": "Origin Type",
        "value": "Soil",
        "searchTerm": "Origin Type",
        "isOriginType": true
      },
      {
        "type": "disable",
        "field": "As above",
        "value": true,
        "searchTerm": "As above"
      },
      {
        "type": "show",
        "field": "Rock Weathering Classification",
        "value": "Extremely",
        "searchTerm": "Rock Weathering Classification"
      },
      {
        "type": "show",
        "field": "Alteration",
        "value": "Extremely",
        "searchTerm": "Rock Alteration Classification"
      }
    ],
    "multipleOptions": true
  },
  {
    "id": "384439",
    "name": "Grading",
    "fieldName": "Grading",
    "type": "element",
    "inputType": "options",
    "databaseField": "astm_grading",
    "required": false,
    "options": [
      {
        "id": "workflow-option-1",
        "name": "Well-graded",
        "value": "Well-graded",
        "visible": true
      },
      {
        "id": "workflow-option-2",
        "name": "Poorly graded",
        "value": "Poorly graded",
        "visible": true
      }
    ],
    "conditions": [
      {
        "type": "show",
        "field": "Soil Type",
        "value": "Gravel"
      },
      {
        "type": "show",
        "field": "Soil Type",
        "value": "Sand"
      }
    ]
  },
  {
    "id": "384468",
    "name": "Soil Plasticity",
    "fieldName": "Soil Plasticity",
    "type": "element",
    "inputType": "options",
    "databaseField": "soil_plasticity",
    "required": true,
    "options": [
      {
        "id": "workflow-option-1",
        "name": "Low",
        "value": "Low",
        "visible": true
      },
      {
        "id": "workflow-option-2",
        "name": "Medium",
        "value": "Medium",
        "visible": true
      },
      {
        "id": "workflow-option-3",
        "name": "High",
        "value": "High",
        "visible": true
      }
    ],
    "conditions": [
      {
        "type": "show",
        "field": "Soil Type",
        "value": "Clay",
        "searchTerm": "Soil Type"
      },
      {
        "type": "show",
        "field": "Soil Type",
        "value": "Silt",
        "searchTerm": "Soil Type"
      }
    ],
    "multipleOptions": true
  },
  {
    "id": "384443",
    "name": "Density",
    "fieldName": "Density",
    "type": "element",
    "inputType": "options",
    "databaseField": "density",
    "required": false,
    "options": [
      {
        "id": "workflow-option-1",
        "name": "Very Loose",
        "value": "Very Loose",
        "visible": true,
        "abbreviation": "VL"
      },
      {
        "id": "workflow-option-2",
        "name": "Loose",
        "value": "Loose",
        "visible": true,
        "abbreviation": "L"
      },
      {
        "id": "workflow-option-3",
        "name": "Medium Dense",
        "value": "Medium Dense",
        "visible": true,
        "abbreviation": "MD"
      },
      {
        "id": "workflow-option-4",
        "name": "Dense",
        "value": "Dense",
        "visible": true,
        "abbreviation": "D"
      },
      {
        "id": "workflow-option-5",
        "name": "Very Dense",
        "value": "Very Dense",
        "visible": true,
        "abbreviation": "VD"
      }
    ],
    "conditions": [
      {
        "type": "show",
        "field": "Soil Type",
        "value": "Gravel",
        "searchTerm": "Soil Type"
      },
      {
        "type": "show",
        "field": "Soil Type",
        "value": "Sand",
        "searchTerm": "Soil Type"
      },
      {
        "type": "show",
        "field": "Soil Type",
        "value": "Peat",
        "searchTerm": "Soil Type"
      }
    ],
    "multipleOptions": true
  },
  {
    "id": "384444",
    "name": "Consistency",
    "fieldName": "Consistency",
    "type": "element",
    "inputType": "options",
    "databaseField": "stiffness",
    "required": false,
    "options": [
      {
        "id": "workflow-option-1",
        "name": "Very Soft",
        "value": "Very Soft",
        "visible": true,
        "abbreviation": "VS"
      },
      {
        "id": "workflow-option-2",
        "name": "Soft",
        "value": "Soft",
        "visible": true,
        "abbreviation": "S"
      },
      {
        "id": "workflow-option-3",
        "name": "Firm",
        "value": "Firm",
        "visible": true,
        "abbreviation": "F"
      },
      {
        "id": "workflow-option-4",
        "name": "Stiff",
        "value": "Stiff",
        "visible": true,
        "abbreviation": "St"
      },
      {
        "id": "workflow-option-5",
        "name": "Very Stiff",
        "value": "Very Stiff",
        "visible": true,
        "abbreviation": "VSt"
      },
      {
        "id": "workflow-option-6",
        "name": "Hard",
        "value": "Hard",
        "visible": true,
        "abbreviation": "H"
      },
      {
        "id": "workflow-option-7",
        "name": "Friable",
        "value": "Friable",
        "visible": true,
        "abbreviation": "Fr",
        "conditions": [
          {
            "type": "show",
            "field": "Soil Type",
            "value": "Silt",
            "searchTerm": "Soil Type"
          }
        ]
      }
    ],
    "conditions": [
      {
        "type": "show",
        "field": "Soil Type",
        "value": "Clay",
        "searchTerm": "Soil Type"
      },
      {
        "type": "show",
        "field": "Soil Type",
        "value": "Silt",
        "searchTerm": "Soil Type"
      }
    ],
    "multipleOptions": true
  },
  {
    "id": "384440",
    "name": "Gravel Grain Size",
    "fieldName": "Gravel Grain Size",
    "type": "element",
    "inputType": "options",
    "databaseField": "soil_gravel_grain_size",
    "required": false,
    "options": [
      {
        "id": "workflow-option-1",
        "name": "Fine",
        "value": "Fine",
        "visible": true
      },
      {
        "id": "workflow-option-2",
        "name": "Medium",
        "value": "Medium",
        "visible": true
      },
      {
        "id": "workflow-option-3",
        "name": "Coarse",
        "value": "Coarse",
        "visible": true
      }
    ],
    "conditions": [
      {
        "type": "show",
        "field": "Soil Type",
        "value": "Gravel",
        "searchTerm": "Soil Type"
      }
    ],
    "multipleOptions": true
  },
  {
    "id": "384442",
    "name": "Gravel Angularity",
    "fieldName": "Gravel Angularity",
    "type": "element",
    "inputType": "options",
    "databaseField": "soil_gravel_angularity",
    "required": false,
    "options": [
      {
        "id": "workflow-option-1",
        "name": "Rounded",
        "value": "Rounded",
        "visible": true
      },
      {
        "id": "workflow-option-2",
        "name": "Sub-rounded",
        "value": "Sub-rounded",
        "visible": true
      },
      {
        "id": "workflow-option-3",
        "name": "Sub-angular",
        "value": "Sub-angular",
        "visible": true
      },
      {
        "id": "workflow-option-4",
        "name": "Angular",
        "value": "Angular",
        "visible": true
      }
    ],
    "conditions": [
      {
        "type": "show",
        "field": "Soil Type",
        "value": "Gravel"
      }
    ],
    "multipleOptions": true
  },
  {
    "id": "384441",
    "name": "Sand Grain Size",
    "fieldName": "Sand Grain Size",
    "type": "element",
    "inputType": "options",
    "databaseField": "soil_sand_grain_size",
    "required": false,
    "options": [
      {
        "id": "workflow-option-1",
        "name": "Fine",
        "value": "Fine",
        "visible": true,
        "isDefault": true
      },
      {
        "id": "workflow-option-2",
        "name": "Medium",
        "value": "Medium",
        "visible": true
      },
      {
        "id": "workflow-option-3",
        "name": "Coarse",
        "value": "Coarse",
        "visible": true,
        "isDefault": true
      }
    ],
    "conditions": [
      {
        "type": "show",
        "field": "Soil Type",
        "value": "Sand",
        "searchTerm": "Soil Type"
      }
    ],
    "multipleOptions": true
  },
  {
    "id": "384469",
    "name": "Organic Content",
    "fieldName": "Organic Content",
    "type": "element",
    "inputType": "options",
    "databaseField": "organic_content",
    "required": false,
    "options": [
      {
        "id": "workflow-option-1",
        "name": "Organic",
        "value": "Organic",
        "visible": true
      },
      {
        "id": "workflow-option-2",
        "name": "Inorganic",
        "value": "Inorganic",
        "visible": true
      }
    ],
    "conditions": [
      {
        "type": "show",
        "field": "Soil Type",
        "value": "Clay",
        "searchTerm": "Soil Type"
      },
      {
        "type": "show",
        "field": "Soil Type",
        "value": "Silt",
        "searchTerm": "Soil Type"
      }
    ]
  },
  {
    "id": "384465",
    "name": "Identifier Gravel Grain Size",
    "fieldName": "Gravel Grain Size",
    "type": "element",
    "inputType": "options",
    "databaseField": "identifier_gravel_grain_size",
    "required": false,
    "options": [
      {
        "id": "workflow-option-1",
        "name": "Fine",
        "value": "Fine",
        "visible": true
      },
      {
        "id": "workflow-option-2",
        "name": "Medium",
        "value": "Medium",
        "visible": true
      },
      {
        "id": "workflow-option-3",
        "name": "Coarse",
        "value": "Coarse",
        "visible": true
      }
    ],
    "conditions": [
      {
        "type": "show",
        "field": "Identifier",
        "value": "Gravelly",
        "searchTerm": "Identifier"
      }
    ],
    "multipleOptions": true
  },
  {
    "id": "384473",
    "name": "Identifier Sand Grain Size",
    "fieldName": "Identifier Sand Grain Size",
    "type": "element",
    "inputType": "options",
    "databaseField": "identifier_sand_grain_size",
    "required": false,
    "options": [
      {
        "id": "workflow-option-1",
        "name": "Fine",
        "value": "Fine",
        "visible": true
      },
      {
        "id": "workflow-option-2",
        "name": "Medium",
        "value": "Medium",
        "visible": true
      },
      {
        "id": "workflow-option-3",
        "name": "Coarse",
        "value": "Coarse",
        "visible": true
      }
    ],
    "conditions": [
      {
        "type": "show",
        "field": "Identifier",
        "value": "Sandy",
        "searchTerm": "Identifier"
      }
    ],
    "multipleOptions": true
  },
  {
    "id": "384474",
    "name": "Identifier Clay Plasticity",
    "fieldName": "Clay Plasticity",
    "type": "element",
    "inputType": "options",
    "databaseField": "clay_plasticity",
    "required": false,
    "options": [
      {
        "id": "workflow-option-1",
        "name": "Low",
        "value": "Low",
        "visible": true
      },
      {
        "id": "workflow-option-2",
        "name": "Medium",
        "value": "Medium",
        "visible": true
      },
      {
        "id": "workflow-option-3",
        "name": "High",
        "value": "High",
        "visible": true
      }
    ],
    "conditions": [
      {
        "type": "show",
        "field": "Identifier",
        "value": "Clayey",
        "searchTerm": "Identifier"
      }
    ],
    "multipleOptions": true
  },
  {
    "id": "384456",
    "name": "Soil Color",
    "fieldName": "Soil Color",
    "type": "element",
    "inputType": "color",
    "databaseField": "soil_color",
    "required": false,
    "optionSet": "colors",
    "options": [
      {
        "id": "workflow-option-1",
        "name": "Brown",
        "value": "Brown",
        "visible": true
      },
      {
        "id": "workflow-option-2",
        "name": "Yellow",
        "value": "Yellow",
        "visible": true
      },
      {
        "id": "workflow-option-3",
        "name": "Orange",
        "value": "Orange",
        "visible": true
      },
      {
        "id": "workflow-option-4",
        "name": "Grey",
        "value": "Grey",
        "visible": true
      },
      {
        "id": "workflow-option-5",
        "name": "Black",
        "value": "Black",
        "visible": true
      },
      {
        "id": "workflow-option-6",
        "name": "Red",
        "value": "Red",
        "visible": true
      }
    ],
    "conditions": [
      {
        "type": "show",
        "field": "Origin",
        "value": "Soil",
        "isOriginType": true
      }
    ]
  },
  {
    "id": "384448",
    "name": "Clay Minor Component",
    "fieldName": "Clay Minor Component",
    "type": "element",
    "inputType": "options",
    "databaseField": "astm_clay_minor_component",
    "required": false,
    "options": [
      {
        "id": "workflow-option-1",
        "name": "Trace",
        "value": "Trace",
        "visible": true
      },
      {
        "id": "workflow-option-2",
        "name": "With",
        "value": "With",
        "visible": true
      }
    ],
    "conditions": [
      {
        "type": "show",
        "field": "Origin",
        "value": "Soil",
        "searchTerm": "Origin Type",
        "isOriginType": true
      },
      {
        "type": "hide",
        "field": "Soil Type",
        "value": "Clay",
        "searchTerm": "Soil Type"
      },
      {
        "type": "hide",
        "field": "Identifier",
        "value": "Clayey",
        "searchTerm": "Identifier"
      }
    ],
    "multipleOptions": true
  },
  {
    "id": "384449",
    "name": "Clay Minor Plasticity",
    "fieldName": "Clay Minor Plasticity",
    "type": "element",
    "inputType": "options",
    "databaseField": "a",
    "required": false,
    "options": [
      {
        "id": "workflow-option-1",
        "name": "Non-plastic",
        "value": "Non-plastic",
        "visible": true
      },
      {
        "id": "workflow-option-2",
        "name": "Low",
        "value": "Low",
        "visible": true
      },
      {
        "id": "workflow-option-3",
        "name": "High",
        "value": "High",
        "visible": true
      }
    ],
    "conditions": [
      {
        "type": "show",
        "field": "Clay Minor Component",
        "value": "Trace",
        "searchTerm": "Clay Minor Component"
      },
      {
        "type": "show",
        "field": "Clay Minor Component",
        "value": "With",
        "searchTerm": "Clay Minor Component"
      }
    ]
  },
  {
    "id": "384450",
    "name": "Gravel Minor Component",
    "fieldName": "Gravel Minor Component",
    "type": "element",
    "inputType": "options",
    "databaseField": "astm_gravel_minor_component",
    "required": false,
    "options": [
      {
        "id": "workflow-option-1",
        "name": "Trace",
        "value": "Trace",
        "visible": true
      },
      {
        "id": "workflow-option-2",
        "name": "With",
        "value": "With",
        "visible": true
      }
    ],
    "conditions": [
      {
        "type": "show",
        "field": "Origin",
        "value": "Soil",
        "searchTerm": "Origin Type",
        "isOriginType": true
      },
      {
        "type": "hide",
        "field": "Soil Type",
        "value": "Gravel",
        "searchTerm": "Soil Type"
      },
      {
        "type": "hide",
        "field": "Identifier",
        "value": "Gravelly",
        "searchTerm": "Identifier"
      }
    ]
  },
  {
    "id": "384451",
    "name": "Gravel Minor Grain Size",
    "fieldName": "Gravel Minor Grain Size",
    "type": "element",
    "inputType": "options",
    "databaseField": "astm_gravel_minor_component_grain_size",
    "required": false,
    "options": [
      {
        "id": "workflow-option-1",
        "name": "Fine",
        "value": "Fine",
        "visible": true
      },
      {
        "id": "workflow-option-2",
        "name": "Medium",
        "value": "Medium",
        "visible": true
      },
      {
        "id": "workflow-option-3",
        "name": "Coarse",
        "value": "Coarse",
        "visible": true
      }
    ],
    "conditions": [
      {
        "type": "show",
        "field": "Gravel Minor Component",
        "value": "Trace",
        "searchTerm": "Gravel Minor Component"
      },
      {
        "type": "show",
        "field": "Gravel Minor Component",
        "value": "With",
        "searchTerm": "Gravel Minor Component"
      }
    ],
    "multipleOptions": true
  },
  {
    "id": "384454",
    "name": "Silt Minor Component",
    "fieldName": "Silt Minor Component",
    "type": "element",
    "inputType": "options",
    "databaseField": "astm_silt_minor_component",
    "required": false,
    "options": [
      {
        "id": "workflow-option-1",
        "name": "Trace",
        "value": "Trace",
        "visible": true
      },
      {
        "id": "workflow-option-2",
        "name": "With",
        "value": "With",
        "visible": true
      }
    ],
    "conditions": [
      {
        "type": "show",
        "field": "Origin",
        "value": "Soil",
        "searchTerm": "Origin Type",
        "isOriginType": true
      },
      {
        "type": "hide",
        "field": "Soil Type",
        "value": "Silt",
        "searchTerm": "Soil Type"
      },
      {
        "type": "hide",
        "field": "Identifier",
        "value": "Silty",
        "searchTerm": "Identifier"
      }
    ]
  },
  {
    "id": "384452",
    "name": "Sand Minor Component",
    "fieldName": "Sand Minor Component",
    "type": "element",
    "inputType": "options",
    "databaseField": "astm_sand_minor_component",
    "required": false,
    "options": [
      {
        "id": "workflow-option-1",
        "name": "Trace",
        "value": "Trace",
        "visible": true
      },
      {
        "id": "workflow-option-2",
        "name": "With",
        "value": "With",
        "visible": true
      }
    ],
    "conditions": [
      {
        "type": "show",
        "field": "Origin",
        "value": "Soil",
        "searchTerm": "Origin Type",
        "isOriginType": true
      },
      {
        "type": "hide",
        "field": "Soil Type",
        "value": "Sand",
        "searchTerm": "Soil Type"
      },
      {
        "type": "hide",
        "field": "Identifier",
        "value": "Sandy",
        "searchTerm": "Identifier"
      }
    ]
  },
  {
    "id": "384453",
    "name": "Sand Minor Grain Size",
    "fieldName": "Sand Minor Grain Size",
    "type": "element",
    "inputType": "options",
    "databaseField": "astm_sand_minor_component_grain_size",
    "required": false,
    "options": [
      {
        "id": "workflow-option-1",
        "name": "Fine",
        "value": "Fine",
        "visible": true
      },
      {
        "id": "workflow-option-2",
        "name": "Medium",
        "value": "Medium",
        "visible": true
      },
      {
        "id": "workflow-option-3",
        "name": "Coarse",
        "value": "Coarse",
        "visible": true
      }
    ],
    "conditions": [
      {
        "type": "show",
        "field": "Sand Minor Component",
        "value": "Trace",
        "searchTerm": "Sand Minor Component"
      },
      {
        "type": "show",
        "field": "Sand Minor Component",
        "value": "With",
        "searchTerm": "Sand Minor Component"
      }
    ],
    "multipleOptions": true
  },
  {
    "id": "384455",
    "name": "Moisture",
    "fieldName": "Moisture",
    "type": "element",
    "inputType": "options",
    "databaseField": "identifier_moisture",
    "required": false,
    "options": [
      {
        "id": "workflow-option-1",
        "name": "Wet",
        "value": "Wet",
        "visible": false,
        "abbreviation": "W",
        "conditions": [
          {
            "type": "show",
            "field": "Soil Type",
            "value": "Sand",
            "searchTerm": "Soil Type"
          },
          {
            "type": "show",
            "field": "Soil Type",
            "value": "Gravel",
            "searchTerm": "Soil Type"
          }
        ]
      },
      {
        "id": "workflow-option-2",
        "name": "Moist",
        "value": "Moist",
        "visible": false,
        "abbreviation": "M",
        "conditions": [
          {
            "type": "show",
            "field": "Soil Type",
            "value": "Gravel",
            "searchTerm": "Soil Type"
          },
          {
            "type": "show",
            "field": "Soil Type",
            "value": "Sand",
            "searchTerm": "Soil Type"
          }
        ]
      },
      {
        "id": "workflow-option-3",
        "name": "Dry",
        "value": "Dry",
        "visible": false,
        "abbreviation": "D",
        "conditions": [
          {
            "type": "show",
            "field": "Soil Type",
            "value": "Sand",
            "searchTerm": "Soil Type"
          },
          {
            "type": "show",
            "field": "Soil Type",
            "value": "Gravel",
            "searchTerm": "Soil Type"
          }
        ]
      },
      {
        "id": "workflow-option-4",
        "name": "w < PL",
        "value": "w < PL",
        "visible": true,
        "conditions": [
          {
            "type": "show",
            "field": "Soil Type",
            "value": "Clay",
            "searchTerm": "Soil Type"
          },
          {
            "type": "show",
            "field": "Soil Type",
            "value": "Silt",
            "searchTerm": "Soil Type"
          }
        ]
      },
      {
        "id": "workflow-option-5",
        "name": "w = PL",
        "value": "w = PL",
        "visible": true,
        "conditions": [
          {
            "type": "show",
            "field": "Soil Type",
            "value": "Clay",
            "searchTerm": "Soil Type"
          },
          {
            "type": "show",
            "field": "Soil Type",
            "value": "Silt",
            "searchTerm": "Soil Type"
          }
        ]
      },
      {
        "id": "workflow-option-6",
        "name": "w > PL",
        "value": "w > PL",
        "visible": true,
        "conditions": [
          {
            "type": "show",
            "field": "Soil Type",
            "value": "Clay",
            "searchTerm": "Soil Type"
          },
          {
            "type": "show",
            "field": "Soil Type",
            "value": "Silt",
            "searchTerm": "Soil Type"
          }
        ]
      },
      {
        "id": "workflow-option-7",
        "name": "w = LL",
        "value": "w = LL",
        "visible": true,
        "abbreviation": "w ≈ LL",
        "conditions": [
          {
            "type": "show",
            "field": "Soil Type",
            "value": "Clay",
            "searchTerm": "Soil Type"
          },
          {
            "type": "show",
            "field": "Soil Type",
            "value": "Silt",
            "searchTerm": "Soil Type"
          }
        ]
      },
      {
        "id": "workflow-option-8",
        "name": "w > LL",
        "value": "w > LL",
        "visible": true,
        "conditions": [
          {
            "type": "show",
            "field": "Soil Type",
            "value": "Clay",
            "searchTerm": "Soil Type"
          },
          {
            "type": "show",
            "field": "Soil Type",
            "value": "Silt",
            "searchTerm": "Soil Type"
          }
        ]
      }
    ],
    "conditions": [
      {
        "type": "show",
        "field": "Origin",
        "value": "Soil",
        "searchTerm": "Origin Type",
        "isOriginType": true
      }
    ],
    "multipleOptions": true
  },
  {
    "id": "384430",
    "name": "Rock Strength",
    "fieldName": "Rock Strength",
    "type": "element",
    "inputType": "options",
    "databaseField": "strength",
    "required": false,
    "options": [
      {
        "id": "workflow-option-1",
        "name": "Very Low",
        "value": "Very Low",
        "visible": true
      },
      {
        "id": "workflow-option-2",
        "name": "Low",
        "value": "Low",
        "visible": true
      },
      {
        "id": "workflow-option-3",
        "name": "Medium",
        "value": "Medium",
        "visible": true,
        "isDefault": true
      },
      {
        "id": "workflow-option-4",
        "name": "High",
        "value": "High",
        "visible": true,
        "isDefault": true
      },
      {
        "id": "workflow-option-5",
        "name": "Very High",
        "value": "Very High",
        "visible": true
      },
      {
        "id": "workflow-option-6",
        "name": "Extremely High",
        "value": "Extremely High",
        "visible": true
      }
    ],
    "conditions": [
      {
        "type": "show",
        "field": "Origin",
        "value": "Rock",
        "searchTerm": "Origin"
      },
      {
        "type": "hide",
        "field": "Rock Weathering Classification",
        "value": "Extremely",
        "searchTerm": "Rock Weathering Classification"
      },
      {
        "type": "hide",
        "field": "Alteration",
        "value": "Extremely",
        "searchTerm": "Rock Alteration Classification"
      }
    ],
    "multipleOptions": true,
    "maxOptionsSelected": 2
  },
  {
    "id": "384467",
    "name": "Rock Grain Size",
    "fieldName": "Rock Grain Size",
    "type": "element",
    "inputType": "options",
    "databaseField": "rock_grain_size",
    "required": false,
    "options": [
      {
        "id": "workflow-option-1",
        "name": "Very Fine",
        "value": "Very Fine",
        "visible": true
      },
      {
        "id": "workflow-option-2",
        "name": "Fine",
        "value": "Fine",
        "visible": true
      },
      {
        "id": "workflow-option-3",
        "name": "Medium",
        "value": "Medium",
        "visible": true
      },
      {
        "id": "workflow-option-4",
        "name": "Coarse",
        "value": "Coarse",
        "visible": true
      },
      {
        "id": "workflow-option-5",
        "name": "Very Coarse",
        "value": "Very Coarse",
        "visible": true
      }
    ],
    "conditions": [
      {
        "type": "show",
        "field": "Origin",
        "value": "Rock",
        "searchTerm": "Origin"
      },
      {
        "type": "hide",
        "field": "Rock Weathering Classification",
        "value": "Extremely",
        "searchTerm": "Rock Weathering Classification"
      },
      {
        "type": "hide",
        "field": "Alteration",
        "value": "Extremely",
        "searchTerm": "Rock Alteration Classification"
      }
    ],
    "multipleOptions": true
  },
  {
    "id": "384431",
    "name": "Rock Texture",
    "fieldName": "Rock Texture",
    "type": "element",
    "inputType": "options",
    "databaseField": "texture",
    "required": false,
    "options": [
      {
        "id": "workflow-option-1",
        "name": "Yes",
        "value": "Yes",
        "visible": true
      },
      {
        "id": "workflow-option-2",
        "name": "No",
        "value": "No",
        "visible": true,
        "isDefault": true
      }
    ],
    "conditions": [
      {
        "type": "show",
        "field": "Origin",
        "value": "Rock",
        "searchTerm": "Origin"
      },
      {
        "type": "hide",
        "field": "Rock Weathering Classification",
        "value": "Extremely",
        "searchTerm": "Rock Weathering Classification"
      },
      {
        "type": "hide",
        "field": "Alteration",
        "value": "Extremely",
        "searchTerm": "Rock Alteration Classification"
      }
    ]
  },
  {
    "id": "384432",
    "name": "Rock Texture Type",
    "fieldName": "Rock Texture Type",
    "type": "element",
    "inputType": "options",
    "databaseField": "rock_texture",
    "optionSet": "rock_texture",
    "required": false,
    "options": [
      {
        "id": "glassy",
        "name": "Glassy",
        "value": "Glassy",
        "visible": true
      },
      {
        "id": "porphyritic",
        "name": "Porphyritic",
        "value": "Porphyritic",
        "visible": true
      },
      {
        "id": "crystalline",
        "name": "Crystalline",
        "value": "Crystalline",
        "visible": true
      },
      {
        "id": "amorphous",
        "name": "Amorphous",
        "value": "Amorphous",
        "visible": true
      },
      {
        "id": "vesicular",
        "name": "Vesicular",
        "value": "Vesicular",
        "visible": true
      }
    ],
    "conditions": [
      {
        "type": "show",
        "field": "Rock Texture",
        "value": "Yes"
      }
    ]
  },
  {
    "id": "384433",
    "name": "Rock Fabric",
    "fieldName": "Rock Fabric",
    "type": "element",
    "inputType": "options",
    "databaseField": "fabric",
    "required": false,
    "options": [
      {
        "id": "workflow-option-1",
        "name": "Yes",
        "value": "Yes",
        "visible": true
      },
      {
        "id": "workflow-option-2",
        "name": "No",
        "value": "No",
        "visible": true
      }
    ],
    "conditions": [
      {
        "type": "show",
        "field": "Rock Texture",
        "value": "No",
        "searchTerm": "Rock Texture"
      }
    ]
  },
  {
    "id": "384434",
    "name": "Rock Fabric Type",
    "fieldName": "Rock Fabric Type",
    "type": "element",
    "inputType": "options",
    "databaseField": "fabric_data",
    "required": false,
    "options": [
      {
        "id": "workflow-option-1",
        "name": "Bedding",
        "value": "Bedding",
        "visible": true
      },
      {
        "id": "workflow-option-2",
        "name": "Lamination",
        "value": "Lamination",
        "visible": true
      },
      {
        "id": "workflow-option-3",
        "name": "Foliation",
        "value": "Foliation",
        "visible": true
      },
      {
        "id": "workflow-option-4",
        "name": "Cleavage",
        "value": "Cleavage",
        "visible": true
      },
      {
        "id": "workflow-option-5",
        "name": "Flow Banding",
        "value": "Flow Banding",
        "visible": true
      }
    ],
    "conditions": [
      {
        "type": "show",
        "field": "Rock Fabric",
        "value": "Yes"
      }
    ]
  },
  {
    "id": "384435",
    "name": "Distict or Indistinct Fabric",
    "fieldName": "Distict or Indistinct Fabric",
    "type": "element",
    "inputType": "options",
    "databaseField": "distinct_type",
    "required": false,
    "options": [
      {
        "id": "workflow-option-1",
        "name": "Distinct",
        "value": "Distinct",
        "visible": true
      },
      {
        "id": "workflow-option-2",
        "name": "Indistinct",
        "value": "Indistinct",
        "visible": true
      }
    ],
    "conditions": [
      {
        "type": "show",
        "field": "Rock Fabric",
        "value": "Yes",
        "searchTerm": "Rock Fabric"
      }
    ]
  },
  {
    "id": "384470",
    "name": "Rock Moisture",
    "fieldName": "Rock Moisture",
    "type": "element",
    "inputType": "options",
    "databaseField": "rock_moisture",
    "required": false,
    "options": [
      {
        "id": "workflow-option-1",
        "name": "Wet",
        "value": "Wet",
        "visible": true,
        "abbreviation": "W"
      },
      {
        "id": "workflow-option-2",
        "name": "Moist",
        "value": "Moist",
        "visible": true,
        "abbreviation": "M",
        "isDefault": true
      },
      {
        "id": "workflow-option-3",
        "name": "Dry",
        "value": "Dry",
        "visible": true,
        "abbreviation": "D"
      }
    ],
    "conditions": [
      {
        "type": "show",
        "field": "Origin Type",
        "value": "Rock",
        "searchTerm": "Origin Type",
        "isOriginType": true
      }
    ],
    "multipleOptions": true
  },
  {
    "id": "384457",
    "name": "Soil Note",
    "fieldName": "Soil Note",
    "type": "element",
    "inputType": "note",
    "databaseField": "soil_note",
    "required": false,
    "conditions": [
      {
        "type": "show",
        "field": "Origin",
        "value": "Soil",
        "isOriginType": true
      }
    ]
  },
  {
    "id": "384459",
    "name": "Rock Color",
    "fieldName": "Rock Color",
    "type": "element",
    "inputType": "color",
    "databaseField": "rock_color",
    "required": false,
    "conditions": [
      {
        "type": "show",
        "field": "Origin",
        "value": "Rock"
      }
    ]
  },
  {
    "id": "384458",
    "name": "Rock Note",
    "fieldName": "Rock Note",
    "type": "element",
    "inputType": "note",
    "databaseField": "rock_note",
    "required": true,
    "conditions": [
      {
        "type": "show",
        "field": "Origin",
        "value": "Rock"
      }
    ]
  }
] as WorkflowStep[];
