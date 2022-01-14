import React, { useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { CellProps } from 'react-table';
import { validateReceipt } from '../../../shared/repositories/receipts';
import { Receipt, ReceiptItem } from '../../../shared/types';
import { brands } from '../brands';
import { categories } from '../categories';
import { mockReceipts } from '../mock-receipts';
import { CustomTable, EditableCell } from './custom-table';

interface ReceiptDetailsProps {
    authToken: string;
}

export const ReceiptDetails: React.FC<ReceiptDetailsProps> = (props) => {
    const history = useHistory();
    const location = useLocation();
    const receipt = location.state as Receipt | undefined;
    const isReadOnlyMode = receipt !== undefined;

    const [address, setAddress] = useState(receipt?.address || '');
    const [amount, setAmount] = useState(String(receipt?.amount || ''));
    const [brand, setBrand] = useState(receipt?.brand || '');
    const [devolutionPeriod, setDevolutionPeriod] = useState(
        String(receipt?.devolutionPeriod || 30)
    );
    const [errorMessages, setErrorMessages] = useState<string[]>([]);
    // const [isLoading, setIsLoading] = useState(false);
    const [items, setItems] = useState<ReceiptItem[]>(receipt?.items || [{} as ReceiptItem]);
    const [notificationAdvance, setNotificationAdvance] = useState(
        String(receipt?.notificationAdvance || 7)
    );
    const [picture, setPicture] = useState<File>();
    const [purchaseDate, setPurchaseDate] = useState(
        receipt?.purchaseDate ? new Date(receipt.purchaseDate).toISOString().slice(0, 16) : ''
    );
    const [reference, setReference] = useState(receipt?.reference || '');
    const [userId, setUserId] = useState(receipt?.userId || '');

    const addItemHandler = () => {
        setItems(items.concat([{} as ReceiptItem]));
    };

    const createReceiptHandler = () => {
        const receiptData: Receipt = {
            address,
            amount: parseFloat(amount),
            brand,
            devolutionPeriod: parseInt(devolutionPeriod),
            id: new Date().getTime(),
            items,
            notificationAdvance: parseInt(notificationAdvance),
            pictureId: new Date().getTime() + '.jpg',
            purchaseDate: new Date(purchaseDate).getTime(),
            reference,
            userId
        };
        const errors = validateReceipt(receiptData);
        if (!picture) {
            errors.unshift({ message: 'Missing receipt picture' });
        }

        if (errors.length > 0) {
            setErrorMessages(errors.map((e) => e.message));
        } else {
            if (receiptData.devolutionPeriod && receiptData.notificationAdvance) {
                const notificationDays =
                    receiptData.devolutionPeriod - receiptData.notificationAdvance;
                const purchaseDate = new Date(receiptData.purchaseDate);
                receiptData.notificationDate = purchaseDate.setDate(
                    purchaseDate.getDate() + notificationDays
                );
            }

            receiptData.items!.forEach((item) => {
                item.id = Math.ceil(Math.random() * 100000);
                item.receiptId = receiptData.id;
            });
            mockReceipts.push(receiptData);
            history.push('/receipts');

            //     setErrorMessages([]);
            //     setIsLoading(true);

            //     const formData = new FormData();
            //     formData.append('receipt', JSON.stringify(receiptData));
            //     picture && formData.append('picture', picture, picture.name);

            //     fetch('/api/receipts', {
            //         body: formData,
            //         headers: {
            //             Authorization: props.authToken
            //         },
            //         method: 'POST'
            //     })
            //         .then((response) => {
            //             if (response.ok) {
            //                 history.push('/receipts');
            //             } else {
            //                 response.json().then((error) => {
            //                     setIsLoading(false);
            //                     if (error instanceof Array) {
            //                         setErrorMessages(error.map((e) => e.message));
            //                     } else {
            //                         setErrorMessages([error.message]);
            //                     }
            //                 });
            //             }
            //         })
            //         .catch((error) => {
            //             console.error(error);
            //             setErrorMessages([error]);
            //             setIsLoading(false);
            //         });
        }
    };

    return (
        <div>
            <p>
                Address
                <input
                    disabled={isReadOnlyMode /*|| isLoading*/}
                    onChange={(event) => setAddress(event.target.value)}
                    type="text"
                    value={address}
                />
            </p>
            <p>
                Amount
                <input
                    disabled={isReadOnlyMode /*|| isLoading*/}
                    onChange={(event) => setAmount(event.target.value)}
                    type="number"
                    value={amount}
                />
            </p>
            <p>
                Brand
                <select
                    disabled={isReadOnlyMode /*|| isLoading*/}
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
                    disabled={isReadOnlyMode /*|| isLoading*/}
                    onChange={(event) => setDevolutionPeriod(event.target.value)}
                    type="number"
                    value={devolutionPeriod}
                />
            </p>
            <p>
                Notification advance
                <input
                    disabled={isReadOnlyMode /*|| isLoading*/}
                    onChange={(event) => setNotificationAdvance(event.target.value)}
                    type="number"
                    value={notificationAdvance}
                />
            </p>
            <p>
                Purchase date
                <input
                    disabled={isReadOnlyMode /*|| isLoading*/}
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
                    disabled={isReadOnlyMode /*|| isLoading*/}
                    onChange={(event) => setReference(event.target.value)}
                    type="text"
                    value={reference}
                />
            </p>
            <p>
                User id
                <input
                    disabled={isReadOnlyMode /*|| isLoading*/}
                    onChange={(event) => setUserId(event.target.value)}
                    type="text"
                    value={userId}
                />
            </p>

            {isReadOnlyMode ? (
                <p>
                    Picture
                    <input disabled={true} type="text" value={receipt!.pictureId} />
                </p>
            ) : (
                <p>
                    Picture
                    <input
                        // disabled={isLoading}
                        onChange={(event) => {
                            setPicture(event.target.files?.item(0) || undefined);
                        }}
                        type="file"
                    />
                </p>
            )}

            {receipt?.pictureUrl && <img src={receipt.pictureUrl} style={{ maxWidth: '100%' }} />}

            <h4>Items</h4>
            <button
                disabled={isReadOnlyMode /*|| isLoading*/}
                onClick={addItemHandler}
                type="button"
            >
                Add item
            </button>
            <CustomTable
                columns={[
                    {
                        Header: 'Amount',
                        accessor: 'amount',
                        Cell: (props: CellProps<ReceiptItem>) => (
                            <EditableCell
                                accessor="amount"
                                collection={items}
                                disabled={isReadOnlyMode /*|| isLoading*/}
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
                        Cell: (props: CellProps<ReceiptItem>) => (
                            <select
                                disabled={isReadOnlyMode /*|| isLoading*/}
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
                        Cell: (props: CellProps<ReceiptItem>) => (
                            <EditableCell
                                accessor="color"
                                collection={items}
                                disabled={isReadOnlyMode /*|| isLoading*/}
                                rowIndex={props.row.index}
                                setCollection={setItems}
                                value={props.value}
                            />
                        )
                    },
                    {
                        Header: 'Name',
                        accessor: 'name',
                        Cell: (props: CellProps<ReceiptItem>) => (
                            <EditableCell
                                accessor="name"
                                collection={items}
                                disabled={isReadOnlyMode /*|| isLoading*/}
                                rowIndex={props.row.index}
                                setCollection={setItems}
                                value={props.value}
                            />
                        )
                    },
                    {
                        Header: 'Quantity',
                        accessor: 'quantity',
                        Cell: (props: CellProps<ReceiptItem>) => (
                            <EditableCell
                                accessor="quantity"
                                collection={items}
                                disabled={isReadOnlyMode /*|| isLoading*/}
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
                        Cell: (props: CellProps<ReceiptItem>) => (
                            <EditableCell
                                accessor="reference"
                                collection={items}
                                disabled={isReadOnlyMode /*|| isLoading*/}
                                rowIndex={props.row.index}
                                setCollection={setItems}
                                value={props.value}
                            />
                        )
                    },
                    {
                        Header: 'Size',
                        accessor: 'size',
                        Cell: (props: CellProps<ReceiptItem>) => (
                            <EditableCell
                                accessor="size"
                                collection={items}
                                disabled={isReadOnlyMode /*|| isLoading*/}
                                rowIndex={props.row.index}
                                setCollection={setItems}
                                value={props.value}
                            />
                        )
                    },
                    {
                        Header: 'Options',
                        Cell: (props: CellProps<ReceiptItem>) => (
                            <button
                                disabled={isReadOnlyMode /*|| isLoading*/}
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

            {isReadOnlyMode ? undefined : (
                <div style={{ display: 'flex' }}>
                    <button
                        // disabled={isLoading}
                        onClick={createReceiptHandler}
                        type="button"
                    >
                        Send
                    </button>

                    {/* {isLoading && (
                        <img
                            height={32}
                            src="/images/spinner.gif"
                            style={{ marginLeft: 16 }}
                            width={32}
                        />
                    )} */}
                </div>
            )}
        </div>
    );
};
