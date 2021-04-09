import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { CellProps } from 'react-table';
import { Receipt } from '../../../shared/types';
import { CustomTable } from './custom-table';

interface ReceiptsProps {
    authToken: string;
}

export const Receipts: React.FC<ReceiptsProps> = (props) => {
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState<string>();
    const [receipts, setReceipts] = useState<Receipt[]>([]);

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
            })
            .finally(() => {
                setIsLoading(false);
            });
    }, []);

    const fetchReceipt = (id: number) => {
        setIsLoading(true);
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
                    setIsLoading(false);
                    response.json().then((error) => setErrorMessage(error.message));
                }
            })
            .catch((error) => {
                setIsLoading(false);
                console.error(error);
                setErrorMessage(error);
            });
    };

    return (
        <React.Fragment>
            {isLoading && (
                <img height={32} src="/images/spinner.gif" style={{ marginLeft: 16 }} width={32} />
            )}
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
                        Cell: (props: CellProps<Receipt, Receipt['notificationDate']>) =>
                            props.value && new Date(props.value).toLocaleDateString()
                    },
                    {
                        Header: 'Picture id',
                        accessor: 'pictureId'
                    },
                    {
                        Header: 'Purchase date',
                        accessor: 'purchaseDate',
                        Cell: (props: CellProps<Receipt, Receipt['purchaseDate']>) =>
                            new Date(props.value).toLocaleDateString()
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
                onRowClick={isLoading ? undefined : (row) => fetchReceipt(row.original.id)}
            />
        </React.Fragment>
    );
};
