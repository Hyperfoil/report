import React from 'react';
import {
    Alert,
    Bullseye,
    Page,
    PageSection,
    Spinner
} from '@patternfly/react-core';
import { useSelector } from 'react-redux'

import Header from './Header';

import { history } from '../redux/store';
import { getAlerts, getData } from '../redux/selectors';

const logoProps = {
    href: '/',
    onClick: (e) => {
        history.push('/')
        e.preventDefault()
    },
    //target: '_blank'
};

export default ({ children }) => {
    const alerts = useSelector(getAlerts);
    const data = useSelector(getData)
    return (
        <Page header={(<Header logoProps={logoProps} />)}>
            <PageSection isFilled={true}>
                {alerts.map(({ title, variant = "danger", message }, index) => (
                    <Alert
                        key={index}
                        variant={variant}
                        title={title}
                    // action={<AlertActionCloseButton onClose={() => { }} />}
                    >
                        <div dangerouslySetInnerHTML={{ __html: message }} />

                    </Alert>
                ))}
                {data ? children : alerts.length === 0 ?
                    (<Bullseye>
                        <Spinner />
                    </Bullseye>) : null
                }
            </PageSection>
        </Page>
    )
}