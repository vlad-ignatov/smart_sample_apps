//
// Get the data for the DM app
//
// pt's with LDL (13457-7) and a1c (4548-4)
// p1272431 Stephan Graham, p967332 William Robinson


pt = {}; // Attach data properties to pt object

var error_callback = function(e){
  alert('error '+e.status+' see console.')
  console.log(e.status);
  console.log(e.message.contentType);
  console.log(e.message.data);
  dfd.reject(e.message);
};

var _round = function(val, dec){
  return Math.round(val*Math.pow(10,dec))/Math.pow(10,dec);
}

var ALLERGIES_get = function(){
  return $.Deferred(function(dfd){
    SMART.ALLERGIES_get()
      // pt's with allergies: J Diaz, K Lewis, K Kelly, R Robinson
      .success(function(r){
        pt.allergies_array = [];
        r.graph
         .prefix('rdf', 'http://www.w3.org/1999/02/22-rdf-syntax-ns#')
         .prefix('sp',  'http://smartplatforms.org/terms#')
         .prefix('dc',  'http://purl.org/dc/terms/')
         .where('?id    rdf:type             sp:Allergy')
         .where('?id    sp:drugClassAllergen ?bn')
         .where('?bn    dc:title             ?title')
         .where('?id    sp:allergicReaction  ?bn2')
         .where('?bn2   dc:title             ?reaction')
         .each(function(){
           pt.allergies_array.push([
             this.title.value.toString(),
             this.reaction.value.toString()
           ])
         })

        r.graph
         .prefix('rdf', 'http://www.w3.org/1999/02/22-rdf-syntax-ns#')
         .prefix('sp',  'http://smartplatforms.org/terms#')
         .prefix('dc',  'http://purl.org/dc/terms/')
         .where('?id    rdf:type            sp:Allergy')
         .where('?id    sp:foodAllergen     ?bn')
         .where('?bn    dc:title            ?title')
         .where('?id    sp:allergicReaction ?bn2')
         .where('?bn2   dc:title            ?reaction')
         .each(function(){
           pt.allergies_array.push([
             this.title.value.toString(),
             this.reaction.value.toString()
           ])
         })
        dfd.resolve();
      })
      .error(error_callback);
  }).promise();
};

var MEDS_get = function(){
  return $.Deferred(function(dfd){
    SMART.MEDS_get()
      .success(function(r){
        pt.meds_array = [];
        r.graph
         .prefix('rdf', 'http://www.w3.org/1999/02/22-rdf-syntax-ns#')
         .prefix('sp',  'http://smartplatforms.org/terms#')
         .prefix('dc',  'http://purl.org/dc/terms/')
         .where('?id    rdf:type        sp:Medication')
         .where('?id    sp:drugName     ?bn')
         .where('?bn    dc:title        ?title')
         .where('?id    sp:instructions ?instruction')
         .each(function(){
           pt.meds_array.push([
             this.title.value.toString(),
             this.instruction.value.toString()
           ])
         })

        console.log(pt.meds_array)
        dfd.resolve();
      })
      .error(error_callback);
  }).promise();
};

var DEMOGRAPHICS_get = function(){
  return $.Deferred(function(dfd){
    SMART.DEMOGRAPHICS_get()
      .success(function(demos){
        var d = demos.graph
          .prefix('foaf', 'http://xmlns.com/foaf/0.1/')
          .prefix('v',    'http://www.w3.org/2006/vcard/ns#')
          .prefix('rdf',  'http://www.w3.org/1999/02/22-rdf-syntax-ns#')
          .prefix('sp',   'http://smartplatforms.org/terms#')
          .where('?r      v:n           ?n')
          .where('?n      rdf:type      v:Name')
          .where('?n      v:given-name  ?given_name')
          .where('?n      v:family-name ?family_name')
          .where('?r      foaf:gender   ?gender')
          .where('?r      v:bday        ?bday')
          .get(0)

        pt.family_name = d.family_name.value;
        pt.given_name = d.given_name.value;
        pt.gender = d.gender.value;
        pt.bday = d.bday.value;

        // // testing json-ld
        // jsdata = { '@graph': [] };
        // demos.graph
        //      .where('?s ?p ?o')
        //      .each(function(i, bindings, triples){
        //        // note: this.s == bindings.s == triples[0].subject
        //        if (i>0) {
        //          // .dump() returns RDF/JSON representation
        //          console.log('s: ', this.s.dump().value, ' (', this.s.dump().type, ')');
        //          console.log('p: ', this.p.dump().value, ' (', this.p.dump().type, ')');
        //          console.log('o: ', this.o.dump().value, ' (', this.o.dump().type, ')', '\n');
        //
        //          // jstriple = {
        //          //   '@id': this.s.dump().value,
        //          //   ''
        //          // };
        //        }
        //      })

        dfd.resolve();
      })
      .error(error_callback);
  }).promise();
};

var VITAL_SIGNS_get = function(){
  return $.Deferred(function(dfd){
    SMART.VITAL_SIGNS_get()
      .success(function(r){
        var _get_bps = function(type) {
          var code = null;
          if (type === 'systolic') code = '<http://purl.bioontology.org/ontology/LNC/8480-6>';
          else if (type === 'diastolic') code = '<http://purl.bioontology.org/ontology/LNC/8462-4>';
          else alert('error: bp type not systolic or diastolic!');

          r.graph
           .prefix('rdf',      'http://www.w3.org/1999/02/22-rdf-syntax-ns#')
           .prefix('sp',       'http://smartplatforms.org/terms#')
           .prefix('dc',       'http://purl.org/dc/terms/')
           .where('?bn         rdf:type         sp:VitalSign')
           .where('?bn         sp:vitalName     ?vital_name')
           .where('?bn         sp:value         ?value')
           .where('?bn         sp:unit          ?unit')
           .where('?vital_name sp:code          ' + code)
           .where('?bn2        sp:'+ type +'    ?bn')
           .where('?bn2        rdf:type         sp:BloodPressure')
           .where('?vital_id   sp:bloodPressure ?bn2')
           .where('?vital_id   dc:date          ?date')
           .each(function(){
             if (type === 'systolic') {
               bp_array = pt.sbp_array;
               bp_latest = pt.sbp_latest;
             }
             else {
               bp_array = pt.dbp_array;
               bp_latest = pt.dbp_latest;
             }

             bp_array.push([
               new XDate(this.date.value).valueOf(),
               Number(this.value.value),
               this.unit.value
             ])
           })

           // FIXME: DRY
           pt.bp_array = _(pt.bp_array).sortBy(function(item){ return item[0]; })
           pt.bp_latest = _(pt.bp_array).last() || null
        }

        // ruby style!
        pt.dbp_array = [];
        pt.sbp_array = [];
        pt.dbp_latest = null;
        pt.sbp_latest = null;
        _get_bps('systolic');
        _get_bps('diastolic')


        pt.weight_array = [];
        pt.weight_latest = null;
        r.graph
         .prefix('rdf',      'http://www.w3.org/1999/02/22-rdf-syntax-ns#')
         .prefix('sp',       'http://smartplatforms.org/terms#')
         .prefix('dc',       'http://purl.org/dc/terms/')
         .where('?vital_id   sp:weight        ?bn')
         .where('?vital_id   dc:date          ?date')
         .where('?bn         sp:vitalName     ?bn2')
         .where('?bn2        sp:code          <http://purl.bioontology.org/ontology/LNC/3141-9>')
         .where('?bn         rdf:type         sp:VitalSign')
         .where('?bn         sp:value         ?value')
         .where('?bn         sp:unit          ?unit')
         .each(function(){
           pt.weight_array.push([
             new XDate(this.date.value).valueOf(),
             Number(this.value.value),
             this.unit.value
           ])
         })

        pt.weight_array = _(pt.weight_array).sortBy(function(item){ return item[0]; })
        pt.weight_latest = _(pt.weight_array).last() || null

        pt.height_array = [];
        pt.height_latest = null;
        r.graph
         .prefix('rdf',      'http://www.w3.org/1999/02/22-rdf-syntax-ns#')
         .prefix('sp',       'http://smartplatforms.org/terms#')
         .prefix('dc',       'http://purl.org/dc/terms/')
         .where('?vital_id   sp:height        ?bn')
         .where('?vital_id   dc:date          ?date')
         .where('?bn         sp:vitalName     ?bn2')
         .where('?bn2        sp:code          <http://purl.bioontology.org/ontology/LNC/8302-2>')
         .where('?bn         rdf:type         sp:VitalSign')
         .where('?bn         sp:value         ?value')
         .where('?bn         sp:unit          ?unit')
         .each(function(){
           pt.height_array.push([
             new XDate(this.date.value).valueOf(),
             Number(this.value.value),
             this.unit.value
           ])
         })

        pt.height_array = _(pt.height_array).sortBy(function(item){ return item[0]; })
        pt.height_latest = _(pt.height_array).last() || null

        dfd.resolve();
      })
      .error(error_callback);
  }).promise();
};

var LAB_RESULTS_get = function(){
  return $.Deferred(function(dfd){
    SMART.LAB_RESULTS_get()
      .success(function(r){
        //
        // FIXME: DRY (obviously)
        //

        // LDL Codes
        //
        // LOINC Code, Long name, Short Name, class, rank # of 2000
        // 13457-7	Cholesterol in LDL [Mass/volume] in Serum or Plasma by calculation	LDLc SerPl Calc-mCnc	CHEM	63
        // 2089-1	Cholesterol in LDL [Mass/volume] in Serum or Plasma	LDLc SerPl-mCnc	CHEM	92
        // 18262-6	Cholesterol in LDL [Mass/volume] in Serum or Plasma by Direct assay	LDLc SerPl Direct Assay-mCnc	CHEM	249
        // FIXME: ONLY top LDL code!!
        pt.ldl_array = [];
        r.graph
         .prefix('rdf', 'http://www.w3.org/1999/02/22-rdf-syntax-ns#')
         .prefix('sp',  'http://smartplatforms.org/terms#')
         .where('?lr    rdf:type              sp:LabResult')
         .where('?lr    sp:labName            ?bn1')
         .where('?bn1   sp:code               <http://purl.bioontology.org/ontology/LNC/13457-7>')
         .where('?lr    sp:quantitativeResult ?bn2')
         .where('?bn2   rdf:type              sp:QuantitativeResult')
         .where('?bn2   sp:valueAndUnit       ?bn3')
         .where('?bn3   rdf:type              sp:ValueAndUnit')
         .where('?bn3   sp:value              ?value')
         .where('?bn3   sp:unit               ?unit')
         .where('?lr    sp:specimenCollected  ?bn4')
         .where('?bn4   sp:startDate          ?date')
         .each(function(){
           // FIXME: hack push all dates + 3 years
           var d = new XDate(this.date.value)
           d.addYears(3, true);

           // array is [js timestamp, value as number, unit as string]
           // flot uses js timestamps on the x axis, we convert them to human-readable strings later
           pt.ldl_array.push([
              d.valueOf(),
              Number(this.value.value),
              this.unit.value
           ])
         })

         pt.ldl_array = _(pt.ldl_array).sortBy(function(item){ return item[0]; })
         pt.ldl_latest = _(pt.ldl_array).last() || null

         // A1C Codes
         //
         // LOINC Code, Long name, Short Name, class, rank # of 2000
         // 4548-4,Hemoglobin A1c/Hemoglobin.total in Blood,Hgb A1c MFr Bld,HEM/BC,81
         // 17856-6,Hemoglobin A1c/Hemoglobin.total in Blood by HPLC,Hgb A1c MFr Bld HPLC,HEM/BC,215
         // FIXME: ONLY top A1c code!!
         pt.a1c_array = [];
         r.graph
          .prefix('rdf', 'http://www.w3.org/1999/02/22-rdf-syntax-ns#')
          .prefix('sp',  'http://smartplatforms.org/terms#')
          .where('?lr    rdf:type              sp:LabResult')
          .where('?lr    sp:labName            ?bn1')
          .where('?bn1   sp:code               <http://purl.bioontology.org/ontology/LNC/4548-4>')
          .where('?lr    sp:quantitativeResult ?bn2')
          .where('?bn2   rdf:type              sp:QuantitativeResult')
          .where('?bn2   sp:valueAndUnit       ?bn3')
          .where('?bn3   rdf:type              sp:ValueAndUnit')
          .where('?bn3   sp:value              ?value')
          .where('?bn3   sp:unit               ?unit')
          .where('?lr    sp:specimenCollected  ?bn4')
          .where('?bn4   sp:startDate          ?date')
          .each(function(){
            // FIXME: hack push all dates + 3 years
            var d = new XDate(this.date.value)
            d.addYears(3, true);

            pt.a1c_array.push([
              d.valueOf(),
              Number(this.value.value),
              this.unit.value
            ])
          })

          pt.a1c_array = _(pt.a1c_array).sortBy(function(item){ return item[0]; })
          pt.a1c_latest = _(pt.a1c_array).last() || null


          // Ur Tp
          //
          // 5804-0,Protein [Mass/volume] in Urine by Test strip,Prot Ur Strip-mCnc,UA,74
          // 2888-6,Protein [Mass/volume] in Urine,Prot Ur-mCnc,UA,292
          // 35663-4,Protein [Mass/volume] in unspecified time Urine,Prot ?Tm Ur-mCnc,UA,635
          // 21482-5,Protein [Mass/volume] in 24 hour Urine,Prot 24H Ur-mCnc,CHEM,1696
          // FIXME: ONLY top code!!
          pt.ur_tp_array = [];
          r.graph
           .prefix('rdf', 'http://www.w3.org/1999/02/22-rdf-syntax-ns#')
           .prefix('sp',  'http://smartplatforms.org/terms#')
           .where('?lr    rdf:type              sp:LabResult')
           .where('?lr    sp:labName            ?bn1')
           .where('?bn1   sp:code               <http://purl.bioontology.org/ontology/LNC/5804-0>')
           .where('?lr    sp:quantitativeResult ?bn2')
           .where('?bn2   rdf:type              sp:QuantitativeResult')
           .where('?bn2   sp:valueAndUnit       ?bn3')
           .where('?bn3   rdf:type              sp:ValueAndUnit')
           .where('?bn3   sp:value              ?value')
           .where('?bn3   sp:unit               ?unit')
           .where('?lr    sp:specimenCollected  ?bn4')
           .where('?bn4   sp:startDate          ?date')
           .each(function(){
             pt.ur_tp_array.push([
                new XDate(this.date.value).valueOf(),
                Number(this.value.value),
                this.unit.value
             ])
           })

           pt.ur_tp_array = _(pt.ur_tp_array).sortBy(function(item){ return item[0]; })
           pt.ur_tp_latest = _(pt.ur_tp_array).last() || null

         // Microalbumin/Creatinine [Mass ratio] in Urine
         //
         // 14959-1,Microalbumin/Creatinine [Mass ratio] in Urine,Microalbumin/Creat Ur-mRto,CHEM,212
         // 14958-3,Microalbumin/Creatinine [Mass ratio] in 24 hour Urine,Microalbumin/Creat 24H Ur-mRto,CHEM,1979
         // FIXME: ONLY top code!!
         pt.micro_alb_cre_ratio_array = [];
         r.graph
          .prefix('rdf', 'http://www.w3.org/1999/02/22-rdf-syntax-ns#')
          .prefix('sp',  'http://smartplatforms.org/terms#')
          .where('?lr    rdf:type              sp:LabResult')
          .where('?lr    sp:labName            ?bn1')
          .where('?bn1   sp:code               <http://purl.bioontology.org/ontology/LNC/14959-1>')
          .where('?lr    sp:quantitativeResult ?bn2')
          .where('?bn2   rdf:type              sp:QuantitativeResult')
          .where('?bn2   sp:valueAndUnit       ?bn3')
          .where('?bn3   rdf:type              sp:ValueAndUnit')
          .where('?bn3   sp:value              ?value')
          .where('?bn3   sp:unit               ?unit')
          .where('?lr    sp:specimenCollected  ?bn4')
          .where('?bn4   sp:startDate          ?date')
          .each(function(){
            // FIXME: hack push all dates + 3 years
            var d = new XDate(this.date.value)
            d.addYears(3, true);

            pt.micro_alb_cre_ratio_array.push([
              d.valueOf(),
              Number(this.value.value),
              this.unit.value
            ])
          })

          pt.micro_alb_cre_ratio_array = _(pt.micro_alb_cre_ratio_array).sortBy(function(item){ return item[0]; })
          pt.micro_alb_cre_ratio_latest = _(pt.micro_alb_cre_ratio_array).last() || null

         // Aspartate aminotransferase / SGOT / AST
         //
         // only 1 code!! #20!!
         //
         // LOINC Code, Long name, Short Name, class, rank # of 2000
         // 1920-8,Aspartate aminotransferase [Enzymatic activity/volume] in Serum or Plasma,AST SerPl-cCnc,CHEM,19
         pt.sgot_array = [];
         r.graph
          .prefix('rdf', 'http://www.w3.org/1999/02/22-rdf-syntax-ns#')
          .prefix('sp',  'http://smartplatforms.org/terms#')
          .where('?lr    rdf:type              sp:LabResult')
          .where('?lr    sp:labName            ?bn1')
          .where('?bn1   sp:code               <http://purl.bioontology.org/ontology/LNC/1920-8>')
          .where('?lr    sp:quantitativeResult ?bn2')
          .where('?bn2   rdf:type              sp:QuantitativeResult')
          .where('?bn2   sp:valueAndUnit       ?bn3')
          .where('?bn3   rdf:type              sp:ValueAndUnit')
          .where('?bn3   sp:value              ?value')
          .where('?bn3   sp:unit               ?unit')
          .where('?lr    sp:specimenCollected  ?bn4')
          .where('?bn4   sp:startDate          ?date')
          .each(function(){
            // FIXME: hack push all dates + 3 years
            var d = new XDate(this.date.value)
            d.addYears(3, true);

            pt.sgot_array.push([
              d.valueOf(),
              Number(this.value.value),
              this.unit.value
            ])
          })

          pt.sgot_array = _(pt.sgot_array).sortBy(function(item){ return item[0]; })
          pt.sgot_latest = _(pt.sgot_array).last() || null

         // Cholesterol (total): only 1 code!! Yay!
         //
         // 2093-3,Cholesterol [Mass/volume] in Serum or Plasma,Cholest SerPl-mCnc,CHEM,32
         pt.cholesterol_total_array = [];
         r.graph
          .prefix('rdf', 'http://www.w3.org/1999/02/22-rdf-syntax-ns#')
          .prefix('sp',  'http://smartplatforms.org/terms#')
          .where('?lr    rdf:type              sp:LabResult')
          .where('?lr    sp:labName            ?bn1')
          .where('?bn1   sp:code               <http://purl.bioontology.org/ontology/LNC/2093-3>')
          .where('?lr    sp:quantitativeResult ?bn2')
          .where('?bn2   rdf:type              sp:QuantitativeResult')
          .where('?bn2   sp:valueAndUnit       ?bn3')
          .where('?bn3   rdf:type              sp:ValueAndUnit')
          .where('?bn3   sp:value              ?value')
          .where('?bn3   sp:unit               ?unit')
          .where('?lr    sp:specimenCollected  ?bn4')
          .where('?bn4   sp:startDate          ?date')
          .each(function(){
            // FIXME: hack push all dates + 3 years
            var d = new XDate(this.date.value)
            d.addYears(3, true);

            pt.cholesterol_total_array.push([
              d.valueOf(),
              Number(this.value.value),
              this.unit.value
            ])
          })

          pt.cholesterol_total_array = _(pt.cholesterol_total_array).sortBy(function(item){ return item[0]; })
          pt.cholesterol_total_latest = _(pt.cholesterol_total_array).last() || null

         // Tri
         //
         // 2571-8,Triglyceride [Mass/volume] in Serum or Plasma,Trigl SerPl-mCnc,CHEM,36
         // 3043-7,Triglyceride [Mass/volume] in Blood,Trigl Bld-mCnc,CHEM,1592
         // fixme only 1 code!
         pt.triglyceride_array = [];
         r.graph
          .prefix('rdf', 'http://www.w3.org/1999/02/22-rdf-syntax-ns#')
          .prefix('sp',  'http://smartplatforms.org/terms#')
          .where('?lr    rdf:type              sp:LabResult')
          .where('?lr    sp:labName            ?bn1')
          .where('?bn1   sp:code               <http://purl.bioontology.org/ontology/LNC/2571-8>')
          .where('?lr    sp:quantitativeResult ?bn2')
          .where('?bn2   rdf:type              sp:QuantitativeResult')
          .where('?bn2   sp:valueAndUnit       ?bn3')
          .where('?bn3   rdf:type              sp:ValueAndUnit')
          .where('?bn3   sp:value              ?value')
          .where('?bn3   sp:unit               ?unit')
          .where('?lr    sp:specimenCollected  ?bn4')
          .where('?bn4   sp:startDate          ?date')
          .each(function(){
            // FIXME: hack push all dates + 3 years
            var d = new XDate(this.date.value)
            d.addYears(3, true);

            pt.triglyceride_array.push([
              d.valueOf(),
              Number(this.value.value),
              this.unit.value
            ])
          })

          pt.triglyceride_array = _(pt.triglyceride_array).sortBy(function(item){ return item[0]; })
          pt.triglyceride_latest = _(pt.triglyceride_array).last() || null

         // HDL
         // 2085-9,Cholesterol in HDL [Mass/volume] in Serum or Plasma,HDLc SerPl-mCnc,CHEM,38
         pt.hdl_array = [];
         r.graph
          .prefix('rdf', 'http://www.w3.org/1999/02/22-rdf-syntax-ns#')
          .prefix('sp',  'http://smartplatforms.org/terms#')
          .where('?lr    rdf:type              sp:LabResult')
          .where('?lr    sp:labName            ?bn1')
          .where('?bn1   sp:code               <http://purl.bioontology.org/ontology/LNC/2085-9>')
          .where('?lr    sp:quantitativeResult ?bn2')
          .where('?bn2   rdf:type              sp:QuantitativeResult')
          .where('?bn2   sp:valueAndUnit       ?bn3')
          .where('?bn3   rdf:type              sp:ValueAndUnit')
          .where('?bn3   sp:value              ?value')
          .where('?bn3   sp:unit               ?unit')
          .where('?lr    sp:specimenCollected  ?bn4')
          .where('?bn4   sp:startDate          ?date')
          .each(function(){
            // FIXME: hack push all dates + 3 years
            var d = new XDate(this.date.value)
            d.addYears(3, true);

            pt.hdl_array.push([
              d.valueOf(),
              Number(this.value.value),
              this.unit.value
            ])
          })

          pt.hdl_array = _(pt.hdl_array).sortBy(function(item){ return item[0]; })
          pt.hdl_latest = _(pt.hdl_array).last() || null

         // BUN
         //
         // 3094-0,Urea nitrogen [Mass/volume] in Serum or Plasma,BUN SerPl-mCnc,CHEM,6
         // 6299-2,Urea nitrogen [Mass/volume] in Blood,BUN Bld-mCnc,CHEM,288
         // fixme only top code
         pt.bun_array = [];
         r.graph
          .prefix('rdf', 'http://www.w3.org/1999/02/22-rdf-syntax-ns#')
          .prefix('sp',  'http://smartplatforms.org/terms#')
          .where('?lr    rdf:type              sp:LabResult')
          .where('?lr    sp:labName            ?bn1')
          .where('?bn1   sp:code               <http://purl.bioontology.org/ontology/LNC/4548-4>')
          .where('?lr    sp:quantitativeResult ?bn2')
          .where('?bn2   rdf:type              sp:QuantitativeResult')
          .where('?bn2   sp:valueAndUnit       ?bn3')
          .where('?bn3   rdf:type              sp:ValueAndUnit')
          .where('?bn3   sp:value              ?value')
          .where('?bn3   sp:unit               ?unit')
          .where('?lr    sp:specimenCollected  ?bn4')
          .where('?bn4   sp:startDate          ?date')
          .each(function(){
            // FIXME: hack push all dates + 3 years
            var d = new XDate(this.date.value)
            d.addYears(3, true);

            pt.bun_array.push([
              d.valueOf(),
              Number(this.value.value),
              this.unit.value
            ])
          })

          pt.bun_array = _(pt.bun_array).sortBy(function(item){ return item[0]; })
          pt.bun_latest = _(pt.bun_array).last() || null

         // Cre
         //
         // 2160-0,Creatinine [Mass/volume] in Serum or Plasma,Creat SerPl-mCnc,CHEM,1
         // 38483-4,Creatinine [Mass/volume] in Blood,Creat Bld-mCnc,CHEM,283
         // fixme only top code
         pt.creatinine_array = [];
         r.graph
          .prefix('rdf', 'http://www.w3.org/1999/02/22-rdf-syntax-ns#')
          .prefix('sp',  'http://smartplatforms.org/terms#')
          .where('?lr    rdf:type              sp:LabResult')
          .where('?lr    sp:labName            ?bn1')
          .where('?bn1   sp:code               <http://purl.bioontology.org/ontology/LNC/2160-0>')
          .where('?lr    sp:quantitativeResult ?bn2')
          .where('?bn2   rdf:type              sp:QuantitativeResult')
          .where('?bn2   sp:valueAndUnit       ?bn3')
          .where('?bn3   rdf:type              sp:ValueAndUnit')
          .where('?bn3   sp:value              ?value')
          .where('?bn3   sp:unit               ?unit')
          .where('?lr    sp:specimenCollected  ?bn4')
          .where('?bn4   sp:startDate          ?date')
          .each(function(){
            // FIXME: hack push all dates + 3 years
            var d = new XDate(this.date.value)
            d.addYears(3, true);

            pt.creatinine_array.push([
              d.valueOf(),
              Number(this.value.value),
              this.unit.value
            ])
          })

          pt.creatinine_array = _(pt.creatinine_array).sortBy(function(item){ return item[0]; })
          pt.creatinine_latest = _(pt.creatinine_array).last() || null


         // Glu
         // 2345-7,Glucose [Mass/volume] in Serum or Plasma,Glucose SerPl-mCnc,CHEM,4
         // 2339-0,Glucose [Mass/volume] in Blood,Glucose Bld-mCnc,CHEM,13
         // fixme only top code
         pt.glucose_array = [];
         r.graph
          .prefix('rdf', 'http://www.w3.org/1999/02/22-rdf-syntax-ns#')
          .prefix('sp',  'http://smartplatforms.org/terms#')
          .where('?lr    rdf:type              sp:LabResult')
          .where('?lr    sp:labName            ?bn1')
          .where('?bn1   sp:code               <http://purl.bioontology.org/ontology/LNC/2345-7>')
          .where('?lr    sp:quantitativeResult ?bn2')
          .where('?bn2   rdf:type              sp:QuantitativeResult')
          .where('?bn2   sp:valueAndUnit       ?bn3')
          .where('?bn3   rdf:type              sp:ValueAndUnit')
          .where('?bn3   sp:value              ?value')
          .where('?bn3   sp:unit               ?unit')
          .where('?lr    sp:specimenCollected  ?bn4')
          .where('?bn4   sp:startDate          ?date')
          .each(function(){
            // FIXME: hack push all dates + 3 years
            var d = new XDate(this.date.value)
            d.addYears(3, true);

            pt.glucose_array.push([
              d.valueOf(),
              Number(this.value.value),
              this.unit.value
            ])
          })

          pt.glucose_array = _(pt.glucose_array).sortBy(function(item){ return item[0]; })
          pt.glucose_latest = _(pt.glucose_array).last() || null

         // BUN
         //
         // 3094-0,Urea nitrogen [Mass/volume] in Serum or Plasma,BUN SerPl-mCnc,CHEM,6
         // 6299-2,Urea nitrogen [Mass/volume] in Blood,BUN Bld-mCnc,CHEM,288
         // fixme only top code
         pt.bun_array = [];
         r.graph
          .prefix('rdf', 'http://www.w3.org/1999/02/22-rdf-syntax-ns#')
          .prefix('sp',  'http://smartplatforms.org/terms#')
          .where('?lr    rdf:type              sp:LabResult')
          .where('?lr    sp:labName            ?bn1')
          .where('?bn1   sp:code               <http://purl.bioontology.org/ontology/LNC/4548-4>')
          .where('?lr    sp:quantitativeResult ?bn2')
          .where('?bn2   rdf:type              sp:QuantitativeResult')
          .where('?bn2   sp:valueAndUnit       ?bn3')
          .where('?bn3   rdf:type              sp:ValueAndUnit')
          .where('?bn3   sp:value              ?value')
          .where('?bn3   sp:unit               ?unit')
          .where('?lr    sp:specimenCollected  ?bn4')
          .where('?bn4   sp:startDate          ?date')
          .each(function(){

            // FIXME: hack push all dates + 3 years
            var d = new XDate(this.date.value)
            d.addYears(3, true);

            pt.bun_array.push([
              d.valueOf(),
              Number(this.value.value),
              this.unit.value
            ])
          })

          pt.bun_array = _(pt.bun_array).sortBy(function(item){ return item[0]; })
          pt.bun_latest = _(pt.bun_array).last() || null

         // resolved!
         dfd.resolve();
      })
      .error(error_callback);
  }).promise();
};


var PROBLEMS_get = function(){
  return $.Deferred(function(dfd){
    SMART.PROBLEMS_get()
      .success(function(r){
        pt.problems_array = [];
        r.graph
         .prefix('rdf', 'http://www.w3.org/1999/02/22-rdf-syntax-ns#')
         .prefix('sp',  'http://smartplatforms.org/terms#')
         .prefix('dc',  'http://purl.org/dc/terms/')
         .where('?id    rdf:type       sp:Problem')
         .where('?id    sp:startDate   ?date')
         .where('?id    sp:problemName ?bn')
         .where('?bn    rdf:type       sp:CodedValue')
         .where('?bn    dc:title       ?title')
         .each(function(){
           pt.problems_array.push([
             new XDate(this.date.value).valueOf(),
             this.title.value
           ])
         })

        pt.problems_array = _(pt.problems_array).sortBy(function(item){ return item[0]; })
        dfd.resolve();
      })
      .error(error_callback);
  }).promise();
};

// On SMART.ready, do all the data api calls and synchronize
// when they are all complete.
SMART.ready(function(){
  $.when(
         ALLERGIES_get()
       , DEMOGRAPHICS_get()
       , VITAL_SIGNS_get()
       , LAB_RESULTS_get()
       , PROBLEMS_get()
       , MEDS_get()
       // , NOTES_get()
       // , VITAL_SIGNS_get()
  )
  .then(function(){

    $('#family_name').text(pt.family_name)
    $('#given_name').text(pt.given_name)
    $('#record_id').text(SMART.record.id)
    $('#birthday').text(pt.bday)
    var b = new XDate(pt.bday)
    $('#age').text(Math.round(b.diffYears(new XDate())));
    $('#gender').text(pt.gender[0])


    // insert data into html
    // last known values (all arrays sorted by ascending dates)
    // FIXME: DRY
    $('#ur_tp_latest_date').text(pt.ur_tp_latest ? new XDate(pt.ur_tp_latest[0]).toString('MM/dd/yy') : null)
    $('#ur_tp_latest_val') .text(pt.ur_tp_latest ? pt.ur_tp_latest[1] : null)
    $('#ur_tp_latest_unit').text(pt.ur_tp_latest ? pt.ur_tp_latest[2] : null)

    $('#micro_alb_cre_ratio_latest_date').text(pt.micro_alb_cre_ratio_latest ? new XDate(pt.micro_alb_cre_ratio_latest[0]).toString('MM/dd/yy') : null)
    $('#micro_alb_cre_ratio_latest_val') .text(pt.micro_alb_cre_ratio_latest ? pt.micro_alb_cre_ratio_latest[1] : null)
    $('#micro_alb_cre_ratio_latest_unit').text(pt.micro_alb_cre_ratio_latest ? pt.micro_alb_cre_ratio_latest[2] : null)

    $('#sgot_latest_date').text(pt.sgot_latest ? new XDate(pt.sgot_latest[0]).toString('MM/dd/yy') : null)
    $('#sgot_latest_val') .text(pt.sgot_latest ? pt.sgot_latest[1] : null)
    $('#sgot_latest_unit').text(pt.sgot_latest ? pt.sgot_latest[2] : null)

    $('#cholesterol_total_latest_date').text(pt.cholesterol_total_latest ? new XDate(pt.cholesterol_total_latest[0]).toString('MM/dd/yy') : null)
    $('#cholesterol_total_latest_val') .text(pt.cholesterol_total_latest ? pt.cholesterol_total_latest[1] : null)
    $('#cholesterol_total_latest_unit').text(pt.cholesterol_total_latest ? pt.cholesterol_total_latest[2] : null)

    $('#triglyceride_latest_date').text(pt.triglyceride_latest ? new XDate(pt.triglyceride_latest[0]).toString('MM/dd/yy') : null)
    $('#triglyceride_latest_val') .text(pt.triglyceride_latest ? pt.triglyceride_latest[1] : null)
    $('#triglyceride_latest_unit').text(pt.triglyceride_latest ? pt.triglyceride_latest[2] : null)

    $('#hdl_latest_date').text(pt.hdl_latest ? new XDate(pt.hdl_latest[0]).toString('MM/dd/yy') : null)
    $('#hdl_latest_val') .text(pt.hdl_latest ? pt.hdl_latest[1] : null)
    $('#hdl_latest_unit').text(pt.hdl_latest ? pt.hdl_latest[2] : null)

    $('#ldl_latest_date').text(pt.ldl_latest ? new XDate(pt.ldl_latest[0]).toString('MM/dd/yy') : null)
    $('#ldl_latest_val') .text(pt.ldl_latest ? pt.ldl_latest[1] : null)
    $('#ldl_latest_unit').text(pt.ldl_latest ? pt.ldl_latest[2] : null)

    $('#bun_latest_date').text(pt.bun_latest ? new XDate(pt.bun_latest[0]).toString('MM/dd/yy') : null)
    $('#bun_latest_val') .text(pt.bun_latest ? pt.bun_latest[1] : null)
    $('#bun_latest_unit').text(pt.bun_latest ? pt.bun_latest[2] : null)

    $('#creatinine_latest_date').text(pt.creatinine_latest ? new XDate(pt.creatinine_latest[0]).toString('MM/dd/yy') : null)
    $('#creatinine_latest_val') .text(pt.creatinine_latest ? pt.creatinine_latest[1] : null)
    $('#creatinine_latest_unit').text(pt.creatinine_latest ? pt.creatinine_latest[2] : null)

    $('#glucose_latest_date').text(pt.glucose_latest ? new XDate(pt.glucose_latest[0]).toString('MM/dd/yy') : null)
    $('#glucose_latest_val') .text(pt.glucose_latest ? pt.glucose_latest[1] : null)
    $('#glucose_latest_unit').text(pt.glucose_latest ? pt.glucose_latest[2] : null)

    $('#a1c_latest_date').text(pt.a1c_latest ? new XDate(pt.a1c_latest[0]).toString('MM/dd/yy') : null)
    $('#a1c_latest_val') .text(pt.a1c_latest ? pt.a1c_latest[1] : null)
    $('#a1c_latest_unit').text(pt.a1c_latest ? pt.a1c_latest[2] : null)

    // other info
    $('#weight_latest_date').text(pt.weight_latest ? new XDate(pt.weight_latest[0]).toString('MM/dd/yy') : null)
    $('#weight_latest_val') .text(pt.weight_latest ? _round(pt.weight_latest[1], 2) : null)
    $('#weight_latest_unit').text(pt.weight_latest ? pt.weight_latest[2] : null)

    $('#height_latest_date').text(pt.height_latest ? new XDate(pt.height_latest[0]).toString('MM/dd/yy') : null)
    $('#height_latest_val') .text(pt.height_latest ? _round(pt.height_latest[1], 2) : null)
    $('#height_latest_unit').text(pt.height_latest ? pt.height_latest[2] : null)

    // $('#pneumovax_latest_date').text(pt.a1c_latest ? new XDate(pt.a1c_latest[0]).toString('MM/dd/yy') : null)
    // $('#flu_shot_latest_date').text(pt.a1c_latest ? new XDate(pt.a1c_latest[0]).toString('MM/dd/yy') : null)

    // problems
    _(pt.problems_array).each(function(e){
      // create a div with class problem
      $('<div></div>', {
        class: 'problem',
        text: e[1]
      }).appendTo('#problems')
    })

    $('.problem').filter(':odd').each(function(i,e){ $(e).css({'background-color': '#ebebeb'}); })

    // (some) cv comorbidities
    // fixme: I'm sure there are many more...
    // http://www.ncbi.nlm.nih.gov/pmc/articles/PMC550650/
    var cv_comorbidities = _(pt.problems_array).filter(function(e) {
      var title = e[1];
      if (title.match(/heart disease/i)) return true;
      if (title.match(/Congestive Heart Failure/i)) return true;
      if (title.match(/Myocardial Infarction/i)) return true;
      if (title.match(/Cerebrovascular Disease	/i)) return true;
      if (title.match(/Hypertension/i)) return true;
      if (title.match(/neuropathic pain/i)) return true;
      if (title.match(/coronary arteriosclerosis/i)) return true;
      if (title.match(/chronic renal impariment/i)) return true;
      if (title.match(/cardiac bypass graft surgery/i)) return true;
      if (title.match(/Preinfarction syndrome/i)) return true;
      if (title.match(/Chest pain/i)) return true;
      if (title.match(/Chronic ischemic heart disease/i)) return true;
      if (title.match(/Disorder of cardiovascular system/i)) return true;
      if (title.match(/Precordial pain/i)) return true;
      return false;
    })

    _(cv_comorbidities).each(function(e){
      $('<div></div>', {
        class: 'cv_comorbidity',
        text: e[1]
      }).appendTo('#cv_comorbidities')
    })

    $('.cv_comorbidity').filter(':odd').each(function(i,e){ $(e).css({'background-color': '#ebebeb'}); })

    // allergies
    _(pt.allergies_array).each(function(e){
      $('<div></div>', {
        class: 'allergy',
        html: '<span class=\'bold\'>' + e[0] + '</span> ' + e[1] + '.'
      }).appendTo('#allergies')
    })

    $('.allergy').filter(':odd').each(function(i,e){ $(e).css({'background-color': '#ebebeb'}); })

    // medications
    _(pt.meds_array).each(function(e){
      $('<div></div>', {
        class: 'medication',
        html: '<span class=\'bold\'>' + e[0] + '</span> ' + e[1] + '.'
      }).appendTo('#medications')
    })

    $('.medication').filter(':odd').each(function(i,e){ $(e).css({'background-color': '#ebebeb'}); })

    //
    // flot
    //

    // testing flot
    var x_min = new XDate('2010').valueOf();
    var x_max = new XDate().valueOf()

    var flot_options_bp = {
      xaxis: {
        mode: 'time',
        timeformat: '%y',
        min: x_min,
        max: x_max,
        tickSize: [1, 'year'],
        minTickSize: [1, 'year']
        // tickLength: 0
      },
      yaxis: {
        min: 50,
        max: 200,
        ticks: [50, 100, 150, 200],
        tickLength: 0
      },
      series: {
        lines: {
          show: false
        },
        points: {
          show: true
        }
      },
      grid: {
        // dark gray rbg(204, 204, 204)  #cccccc
        // light gray rbg(235, 235, 235) #ebebeb
        // color: '#ebebeb',
        backgroundColor: '#ebebeb',
        borderWidth: 1,
        markings: [
          { yaxis: { from: 80, to: 80 }, color: "#ccc" },
          { yaxis: { from: 130, to: 130 }, color: "#ccc" }
        ]
      }
    }

    // alter the options for the other two graphs
    var flot_options_ldl = $.extend(true, {}, flot_options_bp);
    var flot_options_a1c = $.extend(true, {}, flot_options_bp);

    flot_options_ldl.yaxis = {
      min: 0,
      max: 200,
      ticks: [0, 50, 100, 150, 200],
      tickLength: 0
    }

    flot_options_ldl.grid = {
      backgroundColor: '#ebebeb',
      borderWidth: 1,
      markings: [
        { yaxis: { from: 200, to: 100 }, color: "#ccc" },
      ]
    }

    flot_options_a1c.yaxis = {
      min: 0,
      max: 20,
      ticks: [0, 5, 10, 15, 20],
      tickLength: 0
    }

    flot_options_a1c.grid = {
      backgroundColor: '#ebebeb',
      borderWidth: 1,
      markings: [
        { yaxis: { from: 20, to: 7 }, color: "#ccc" },
      ]
    }

    // set the heights for the graphs and set the width
    // of the a1c graph to be the same as the other graphs
    // var w = $('#column_1').width();
    var h = 100;
    $('#bp_graph').height(h);
    $('#ldl_graph').height(h);
    $('#a1c_graph').height(h).width($('#bp_graph').width());

    // plot'em!
    $.plot($("#bp_graph"), [pt.dbp_array, pt.sbp_array], flot_options_bp);
    $.plot($("#ldl_graph"), [pt.ldl_array], flot_options_ldl);
    $.plot($("#a1c_graph"), [pt.a1c_array], flot_options_a1c);
  });
});
