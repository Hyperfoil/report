import React, { useState, useMemo } from 'react';
import { useSelector } from 'react-redux'
import {
    Card,
    CardHeader,
    CardBody,
    PageSection,
    Toolbar,
    ToolbarGroup,
    ToolbarItem,
} from '@patternfly/react-core';
import {
    getData, 
    getStats,
    getForkMetricMap, 
    getAllTotals, 
    getAllFailures, 
    getAllPhaseNames,
    getAllForkNames,
    getAllMetricNames,
} from '../redux/selectors';

export default () => {
    const failures = useSelector(getAllFailures)
    return (
        <React.Fragment>
            <PageSection>
            {failures.length > 0 ? (                
                    failures.map((failure, failureIndex) => {
                        return (
                            <div key={`failure.${failureIndex}`} className="pf-c-alert pf-m-danger pf-m-inline" aria-label="Inline danger alert">
                                <div className="pf-c-alert__icon">
                                    <i className="fas fa-exclamation-circle" aria-hidden="true"></i>
                                </div>
                                <h4 className="pf-c-alert__title">
                                    <span className="pf-screen-reader">SLA Failure</span>SLA Failure: {failure.phase} {failure.metric}</h4>
                                <div className="pf-c-alert__description">
                                    <p>{failure.message}</p>
                                </div>
                            </div>
                        )
                    })                
            ) : "no failures"}
            </PageSection>
        </React.Fragment>
    )
}