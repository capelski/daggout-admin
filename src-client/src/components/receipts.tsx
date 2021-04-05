import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { CustomTable } from './custom-table';

interface ReceiptsProps {
    authToken: string;
}

export const Receipts: React.FC<ReceiptsProps> = (props) => {
    const [errorMessage, setErrorMessage] = useState<string>();
    const [receipts, setReceipts] = useState<any[]>([]);

    const history = useHistory();

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
                console.error(error);
                setErrorMessage(error);
            });
    }, []);

    const fetchReceipt = (id: number) => {
        fetch(`/api/receipts/${id}`, {
            headers: {
                Authorization: props.authToken
            },
            method: 'GET'
        })
            .then((response) => {
                if (response.ok) {
                    response.json().then((receipt) => {
                        history.push('/receipt-details', receipt);
                    });
                } else {
                    response.json().then((error) => setErrorMessage(error.message));
                }
            })
            .catch((error) => {
                console.error(error);
                setErrorMessage(error);
            });
    };

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
                onRowClick={(row) => fetchReceipt(row.original.id)}
            />
        </React.Fragment>
    );
};
