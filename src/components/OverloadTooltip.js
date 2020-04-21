//https://github.com/recharts/recharts/issues/275#issuecomment-386696660
import React from 'react';
import DefaultTooltipContent from 'recharts/lib/component/DefaultTooltipContent';

export default ({extra=[],...props})=>{
    props.payload.forEach((payload,index)=>{
        if(payload.unit === "ns"){
            payload.value = payload.value/1000000.0;
            payload.unit="ms";
        }
    })
    if(props.payload[0]){
        extra.forEach(toAdd=>{
            if(typeof toAdd === "function"){
                props.payload.push(toAdd(props.payload[0].payload))
            }
        })
        // example of what needs to be pushed into payload
        // props.payload.push({
        //     color: "red",
        //     name: "foo",
        //     value: "bar"
        // })
    }
    return (<DefaultTooltipContent {...props} />);
}
