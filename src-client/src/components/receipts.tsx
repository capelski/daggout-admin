import React, { useEffect, useState } from 'react';
import { CustomTable } from './custom-table';

interface ReceiptsProps {
    authToken: string;
}

export const Receipts: React.FC<ReceiptsProps> = (props) => {
    const [errorMessage, setErrorMessage] = useState<string>();
    const [receipts, setReceipts] = useState<any[]>([]);

    useEffect(() => {
        fetch('/api/receipts', {
            headers: {
                Authorization: props.authToken
            },
            method: 'GET'
        })
            .then((response) => {
                if (response.ok) {
                    response.json().then(setReceipts);
                } else {
                    response.json().then((error) => setErrorMessage(error.message));
                }
            })
            .catch((error) => {
                console.log(error);
                setErrorMessage(error);
            });
    }, []);

    return (
        <React.Fragment>
            <p>{errorMessage}</p>
            <CustomTable
                columns={[
                    {
                        Header: 'Id',
                        accessor: 'id'
                    },
                    {
                        Header: 'Address',
                        accessor: 'address'
                    },
                    {
                        Header: 'Amount',
                        accessor: 'amount'
                    },
                    {
                        Header: 'Brand',
                        accessor: 'brand'
                    },
                    {
                        Header: 'Devolution period',
                        accessor: 'devolutionPeriod'
                    },
                    {
                        Header: 'Notification advance',
                        accessor: 'notificationAdvance'
                    },
                    {
                        Header: 'Notification date',
                        accessor: 'notificationDate',
                        Cell: (props) => new Date(props.value).toLocaleDateString()
                    },
                    {
                        Header: 'Picture id',
                        accessor: 'pictureId'
                    },
                    {
                        Header: 'Purchase date',
                        accessor: 'purchaseDate',
                        Cell: (props) => new Date(props.value).toLocaleDateString()
                    },
                    {
                        Header: 'Reference',
                        accessor: 'reference'
                    },
                    {
                        Header: 'User id',
                        accessor: 'userId'
                    }
                ]}
                data={receipts}
            />
        </React.Fragment>
    );
};
