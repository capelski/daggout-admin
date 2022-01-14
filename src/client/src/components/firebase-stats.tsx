import React, { useState } from 'react';
import { FirebaseStats as IFirebaseStats } from '../../../shared/types';
import { mockFirebaseStats } from '../mock-firebase-stats';
import { CustomTable } from './custom-table';

interface FirebaseStatsProps {
    authToken: string;
}

export const FirebaseStats: React.FC<FirebaseStatsProps> = () => {
    // const [errorMessage, setErrorMessage] = useState<string>();
    const [stats /*, setStats*/] = useState<Partial<IFirebaseStats>>(mockFirebaseStats);

    // useEffect(() => {
    //     fetch('/api/firebase-stats', {
    //         headers: {
    //             Authorization: props.authToken
    //         },
    //         method: 'GET'
    //     })
    //         .then((response) => {
    //             if (response.ok) {
    //                 response.json().then(setStats);
    //             } else {
    //                 response.json().then((error) => setErrorMessage(error.message));
    //             }
    //         })
    //         .catch((error) => {
    //             console.log(error);
    //             setErrorMessage(error);
    //         });
    // }, []);
    return (
        <div>
            {/* <p>{errorMessage}</p> */}
            <p>Notifiable users: {stats.notifiableUsers || '-'}</p>
            <p>Uploaded receipts: {stats.uploadedReceipts || '-'}</p>
            <p>Users without receipts: {stats.usersWithoutReceipt || '-'}</p>
            <p>Users with referral code: {stats.usersWithReferralCode || '-'}</p>
            <h3>Users by receipts</h3>
            <CustomTable
                columns={[
                    {
                        Header: '# Receipts',
                        accessor: 'receipts'
                    },
                    {
                        Header: 'User email',
                        accessor: 'userEmail'
                    },
                    {
                        Header: 'User id',
                        accessor: 'userId'
                    }
                ]}
                data={stats.receiptsRanking || []}
            />
            <h3>Referrals</h3>
            <CustomTable
                columns={[
                    {
                        Header: '# Referrals',
                        accessor: 'referrals'
                    },
                    {
                        Header: 'User email',
                        accessor: 'userEmail'
                    },
                    {
                        Header: 'User id',
                        accessor: 'userId'
                    }
                ]}
                data={stats.referrals || []}
            />
        </div>
    );
};
