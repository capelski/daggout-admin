import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import { brands } from '../brands';
import { categories } from '../categories';
import { CustomTable, EditableCell } from './custom-table';

interface AddReceiptProps {
    authToken: string;
}

export const AddReceipt: React.FC<AddReceiptProps> = (props) => {
    const [address, setAddress] = useState('');
    const [amount, setAmount] = useState('');
    const [brand, setBrand] = useState('');
    const [devolutionPeriod, setDevolutionPeriod] = useState('30');
    const [errorMessages, setErrorMessages] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [items, setItems] = useState<any[]>([{}]);
    const [notificationAdvance, setNotificationAdvance] = useState('7');
    const [picture, setPicture] = useState<File>();
    const [purchaseDate, setPurchaseDate] = useState('');
    const [reference, setReference] = useState('');
    const [userId, setUserId] = useState('');

    const history = useHistory();

    const addItemHandler = () => {
        setItems(items.concat([{}]));
    };

    const createReceiptHandler = () => {
        setErrorMessages([]);
        setIsLoading(true);
        const formData = new FormData();

        formData.append(
            'receipt',
            JSON.stringify({
                address,
                amount: parseFloat(amount),
                brand,
                devolutionPeriod: parseInt(devolutionPeriod),
                notificationAdvance: parseInt(notificationAdvance),
                items,
                purchaseDate: new Date(purchaseDate).getTime(),
                reference,
                userId
            })
        );
        picture && formData.append('picture', picture, picture.name);

        fetch('/api/receipts', {
            body: formData,
            headers: {
                Authorization: props.authToken
            },
            method: 'POST'
        })
            .then((response) => {
                if (response.ok) {
                    history.push('/receipts');
                } else {
                    response.json().then((error) => {
                        setIsLoading(false);
                        if (error instanceof Array) {
                            setErrorMessages(error.map((e) => e.message));
                        } else {
                            setErrorMessages([error.message]);
                        }
                    });
                }
            })
            .catch((error) => {
                console.log(error);
                setErrorMessages([error]);
                setIsLoading(false);
            });
    };

    return (
        <div>
            <p>
                Address
                <input
                    disabled={isLoading}
                    onChange={(event) => setAddress(event.target.value)}
                    type="text"
                    value={address}
                />
            </p>
            <p>
                Amount
                <input
                    disabled={isLoading}
                    onChange={(event) => setAmount(event.target.value)}
                    type="number"
                    value={amount}
                />
            </p>
            <p>
                Brand
                <select
                    disabled={isLoading}
                    onChange={(event) => {
                        setBrand(event.target.value);
                    }}
                    value={brand}
                >
                    <option value="" label="-- Select" />
                    {brands.map((b) => (
                        <option key={b} label={b} value={b} />
                    ))}
                </select>
            </p>
            <p>
                Devolution period
                <input
                    disabled={isLoading}
                    onChange={(event) => setDevolutionPeriod(event.target.value)}
                    type="number"
                    value={devolutionPeriod}
                />
            </p>
            <p>
                Notification advance
                <input
                    disabled={isLoading}
                    onChange={(event) => setNotificationAdvance(event.target.value)}
                    type="number"
                    value={notificationAdvance}
                />
            </p>
            <p>
                Purchase date
                <input
                    disabled={isLoading}
                    onChange={(event) => {
                        setPurchaseDate(event.target.value);
                    }}
                    type="datetime-local"
                    value={purchaseDate}
                />
            </p>
            <p>
                Reference
                <input
                    disabled={isLoading}
                    onChange={(event) => setReference(event.target.value)}
                    type="text"
                    value={reference}
                />
            </p>
            <p>
                User id
                <input
                    disabled={isLoading}
                    onChange={(event) => setUserId(event.target.value)}
                    type="text"
                    value={userId}
                />
            </p>

            <p>
                Picture
                <input
                    disabled={isLoading}
                    onChange={(event) => {
                        setPicture(event.target.files?.item(0) || undefined);
                    }}
                    type="file"
                />
            </p>

            <h4>Items</h4>
            <button disabled={isLoading} onClick={addItemHandler} type="button">
                Add item
            </button>
            <CustomTable
                columns={[
                    {
                        Header: 'Amount',
                        accessor: 'amount',
                        Cell: (props) => (
                            <EditableCell
                                accessor="amount"
                                collection={items}
                                disabled={isLoading}
                                inputType="number"
                                rowIndex={props.row.index}
                                setCollection={setItems}
                                value={props.value}
                            />
                        )
                    },
                    {
                        Header: 'Category',
                        accessor: 'category',
                        Cell: (props) => (
                            <select
                                disabled={isLoading}
                                onChange={(event) => {
                                    setItems(
                                        items.map((item, itemIndex) => {
                                            return itemIndex === props.row.index
                                                ? { ...item, category: event.target.value }
                                                : item;
                                        })
                                    );
                                }}
                                value={props.value}
                            >
                                <option value="" label="-- Select" />
                                {categories.map((c) => (
                                    <option key={c} label={c} value={c} />
                                ))}
                            </select>
                        )
                    },
                    {
                        Header: 'Color',
                        accessor: 'color',
                        Cell: (props) => (
                            <EditableCell
                                accessor="color"
                                collection={items}
                                disabled={isLoading}
                                rowIndex={props.row.index}
                                setCollection={setItems}
                                value={props.value}
                            />
                        )
                    },
                    {
                        Header: 'Name',
                        accessor: 'name',
                        Cell: (props) => (
                            <EditableCell
                                accessor="name"
                                collection={items}
                                disabled={isLoading}
                                rowIndex={props.row.index}
                                setCollection={setItems}
                                value={props.value}
                            />
                        )
                    },
                    {
                        Header: 'Quantity',
                        accessor: 'quantity',
                        Cell: (props) => (
                            <EditableCell
                                accessor="quantity"
                                collection={items}
                                disabled={isLoading}
                                inputType="number"
                                rowIndex={props.row.index}
                                setCollection={setItems}
                                value={props.value}
                            />
                        )
                    },
                    {
                        Header: 'Reference',
                        accessor: 'reference',
                        Cell: (props) => (
                            <EditableCell
                                accessor="reference"
                                collection={items}
                                disabled={isLoading}
                                rowIndex={props.row.index}
                                setCollection={setItems}
                                value={props.value}
                            />
                        )
                    },
                    {
                        Header: 'Size',
                        accessor: 'size',
                        Cell: (props) => (
                            <EditableCell
                                accessor="size"
                                collection={items}
                                disabled={isLoading}
                                rowIndex={props.row.index}
                                setCollection={setItems}
                                value={props.value}
                            />
                        )
                    },
                    {
                        Header: 'Options',
                        Cell: (props) => (
                            <button
                                disabled={isLoading}
                                onClick={() => {
                                    setItems(
                                        items.filter(
                                            (_item, itemIndex) => itemIndex !== props.row.index
                                        )
                                    );
                                }}
                                type="button"
                            >
                                Delete
                            </button>
                        )
                    }
                ]}
                data={items}
            />

            {errorMessages.map((errorMessage) => (
                <p key={errorMessage} style={{ color: 'red' }}>
                    {errorMessage}
                </p>
            ))}

            <div style={{ display: 'flex' }}>
                <button disabled={isLoading} onClick={createReceiptHandler} type="button">
                    Send
                </button>

                {isLoading && (
                    <img
                        height={32}
                        src="/images/spinner.gif"
                        style={{ marginLeft: 16 }}
                        width={32}
                    />
                )}
            </div>
        </div>
    );
};
