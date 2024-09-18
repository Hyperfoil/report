import React from 'react';
import { useSelector } from 'react-redux'
import {
    PageSection,
} from '@patternfly/react-core';
import {
    getAllErrors,
} from '../redux/selectors';

export default () => {
    const errors = useSelector(getAllErrors)
    return (
        <React.Fragment>
            <PageSection>
            {errors.length > 0 ? (
                    errors.map((error, errorIndex) => {
                        return (
                            <div key={`error.${errorIndex}`} className="pf-c-alert pf-m-danger pf-m-inline" aria-label="Inline danger alert">
                                <div className="pf-c-alert__icon">
                                    <i className="fas fa-exclamation-circle" aria-hidden="true"></i>
                                </div>
                                <h4 className="pf-c-alert__title">
                                    <span className="pf-screen-reader">Hyperfoil Error: </span>{error.agent}</h4>
                                <div className="pf-c-alert__description">
                                    <p>{error.msg}</p>
                                </div>
                            </div>
                        )
                    })
            ) : "no errors"}
            </PageSection>
        </React.Fragment>
    )
}